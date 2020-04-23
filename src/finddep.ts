import * as vscode from 'vscode';
let rootPath: string = vscode.workspace.getConfiguration().get('finddep.rootPath') || "";
if (rootPath === "") {
    const workspaceFolders = vscode.workspace.workspaceFolders || [];
    rootPath = workspaceFolders[0].uri.path;
}
const fileType: any = vscode.workspace.getConfiguration().get('finddep.fileType') || '.js';

const fileExclude = ['node_modules'];
const fs = require('fs');
const { join, extname, dirname } = require('path');

const REGMATCH = new RegExp(/import.+from\s['"](\.+.+)['"];*\n/g);


interface depFileType {
    depPath: Array<string>;
    filePath: string;
}
function readFilePromise (filePath: string) {
    return new Promise<depFileType>((resolve, reject) => {
        fs.readFile(filePath, 'utf8', (err: Object, data: string) => {
            if (err) {
                reject(err);
            }
            let matchStr;
            const depPath: Array<string> = [];
            while((matchStr = REGMATCH.exec(data)) !== null) {
                depPath.push(join(dirname(filePath), matchStr[1]));
            }
            resolve({ filePath, depPath });
        });
    });
}

function findAllFile (path: string): Array<string> {
    let files:Array<string> = fs.readdirSync(path);
    let depFile:Array<string> = [];
    files.forEach(file => {
        let filePath:string = join(path, file);
        let fileStat = fs.statSync(filePath);
        if (fileStat.isDirectory() && !fileExclude.includes(file)) {
            depFile = depFile.concat(findAllFile(filePath));
        } else if ((Array.isArray(fileType) ? fileType.includes(extname(file)) : fileType === extname(file)) && fileStat.isFile()) {
            depFile.push(filePath);
        }
    });
    return depFile;
}
function collectDep (): Promise<Array<depFileType>> {

    function _isEmptyArray ({ depPath } : depFileType): boolean {
        return Array.isArray(depPath) && depPath.length > 0;
    }
    function _filterDepFile (data: depFileType[]): Array<depFileType> {
        return data.filter(_isEmptyArray);
    }

    const filePaths = findAllFile(rootPath);
    const readFileP: Array<Promise<depFileType>> = [];
    filePaths.forEach(filePath => {
        readFileP.push(readFilePromise(filePath));
    });
    return Promise.all(readFileP).then(_filterDepFile);
    
}
async function getDepFile (uri:string) {
    const fileNoExt = uri.substring(0, uri.lastIndexOf('.'));
    const dep:Array<depFileType> = await collectDep();
    const beDeped:Array<string> = [];
    dep.forEach(file => {
        const { filePath, depPath } = file;
        if (depPath.indexOf(fileNoExt) !== -1) {
            beDeped.push(filePath);
        }
    });
    return beDeped;
}
export default getDepFile;


