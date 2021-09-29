import Lambda from 'aws-sdk/clients/lambda';
import {ListFunctionsResponse, ListVersionsByFunctionResponse} from "aws-sdk/clients/lambda";
import pull from 'lodash.pull';
import shuffle from 'lodash.shuffle';

const { AWS_REGION:region = 'us-east-1', ESCLUDE_REGEX: escludeRegex = /edge/ } = process.env;
const lambda = new Lambda({apiVersion: '2015-03-31', region});

let functions: any[] = [];

const listFunctions = () => {
    console.log('listing all available functions');

    const loop: (marker: (string | undefined), acc: any[]) => Promise<any> = async (marker: string | undefined, acc: any[]) => {
        const params = {
            Marker: marker,
            MaxItems: 10
        };

        const res: ListFunctionsResponse = await lambda.listFunctions(params).promise();
        const functions = res.Functions?.map(x => x.FunctionArn);
        const newAcc = acc.concat(functions);

        if (res.NextMarker) {
            return loop(res.NextMarker, newAcc);
        } else {
            return shuffle(newAcc);
        }
    };

    return loop(undefined, []);
};

const listVersions = (funcArn: string) => {
    console.log(`listing versions for function : ${funcArn}`);

    const loop: (marker: (string | undefined), acc: any[]) => (any) = async (marker: string | undefined, acc: any[]) => {
        const params = {
            FunctionName: funcArn,
            Marker: marker,
            MaxItems: 20
        };

        const res: ListVersionsByFunctionResponse = await lambda.listVersionsByFunction(params).promise();
        const versions = res.Versions?.map(x => x.Version).filter(x => x != "$LATEST");
        const newAcc = acc.concat(versions);

        if (res.NextMarker) {
            return loop(res.NextMarker, newAcc);
        } else {
            return newAcc;
        }
    };

    return loop(undefined, []);
}

const listAliasedVersions = (funcArn: string) => {
    console.log(`listing aliases for function : ${funcArn}`);

    const loop: (marker: (string | undefined), acc: any[]) => Promise<any> = async (marker: string | undefined, acc: any[]) => {
        const params = {
            FunctionName: funcArn,
            Marker: marker,
            MaxItems: 20
        };

        const res: Lambda.Types.ListAliasesResponse = await lambda.listAliases(params).promise();
        const versions = res.Aliases?.map(x => x.FunctionVersion);
        const newAcc = acc.concat(versions);

        if (res.NextMarker) {
            return await loop(res.NextMarker, newAcc);
        } else {
            return newAcc;
        }
    }

    return loop(undefined, []);
}

const deleteVersion = async (funcArn: string, version: string) => {
    console.log(`deleting [${funcArn}] version [${version}]`);

    const params = {
        FunctionName: funcArn,
        Qualifier: version
    };

    const res = await lambda.deleteFunction(params).promise();
    console.log(res);
}

const cleanFunc = async (funcArn: string) => {
    console.log(`cleaning function: ${funcArn}`);
    const aliasedVersions = await listAliasedVersions(funcArn);
    console.log('found aliased versions:\n', aliasedVersions);

    const versions = await listVersions(funcArn);
    console.log('found versions:\n', versions);

    if (!funcArn.match(escludeRegex)) {
        for (const version of versions) {
            if (aliasedVersions.includes(version)) {
                await deleteVersion(funcArn, version);
            }
        }
    } else {
        console.log(`skipping functions matching ${escludeRegex}`);
    }
}

export const clean = async () => {
    if (functions.length === 0) {
        functions = await listFunctions();
    }

    // clone the functions that are left to do so that as we iterate with it we
    // can remove cleaned functions from 'functions'
    const toClean = functions.map(x => x);
    console.log(`${toClean.length} functions to clean:\n`, toClean);

    for (const func of toClean) {
        await cleanFunc(func);
        pull(functions, func);
    }
}
