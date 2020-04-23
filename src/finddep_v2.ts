const { join, extname, dirname } = require('path');
const fs = require('fs');
const parser = require("@babel/parser");
import traverse from "@babel/traverse";
// 获取根目录路径
import * as vscode from 'vscode';
const workspaceFolders = vscode.workspace.workspaceFolders || [{ uri: { path: '' } }]; 
const rootPath:string = workspaceFolders[0].uri.path;

const fileExclude:string[] = vscode.workspace.getConfiguration().get('finddep.exclude') || ['node_modules'];
const FILEEXTNAME = ['.js', 'vue'];
interface DepFileType {
    depPath: Array<string>;
    filePath: string;
}

/**
 * 
 * @param path {string} 文件路径
 * @return { Promise<string> } 文件内容的promise
 */
function _getFileCode (path: string) :Promise<string> {
    return new Promise(resolve => {
        fs.readFile(path, 'utf8', (err:any, data:string) => {
            if (err) {
                resolve('');
            } else {
                resolve(data);
            }
        });
    });
}

/**
 * 
 * @param code { string } 读取的文件代码
 * @returns ast 文件的ast--Object
 */
function _getDepByAst (code:string, uri: string) :DepFileType {
    const DIRNAME = dirname(uri);
    const ast = parser.parse(code, { sourceType: "module" });
    const depList: Array<string> = [];
    try {
        traverse(ast, {
            ImportDeclaration (path:any) {
                if (/.*\.\/.+/i.test(path.node.source.value)) {
                    depList.push(join(DIRNAME,path.node.source.value));
                }
            },
            VariableDeclarator (path:any) {
                const { node: { init } } = path;
                if (init.type === 'CallExpression' && init.callee.name === 'require') {
                    if (/.*\.\/.+/i.test(init.arguments[0].value)) {
                        depList.push(join(DIRNAME,init.arguments[0].value));
                    }
                }
            }
        });
        
    } catch (e) {
    }
    return { 
        filePath: uri,
        depPath: depList
    };
}


function _findAllFile (path: string): Array<string> {
    let depFile:Array<string> = [];
    if (path !== "") {
        let files:Array<string> = fs.readdirSync(path);
        files.forEach(file => {
            let filePath:string = join(path, file);
            let fileStat = fs.statSync(filePath);
            if (fileStat.isDirectory() && !fileExclude.includes(file)) {
                depFile = depFile.concat(_findAllFile(filePath));
            } else if (fileStat.isFile() && FILEEXTNAME.includes(extname(file))) {
                depFile.push(filePath);
            }
        });
    }
    return depFile;
}

function _collectDep () {
    function _isEmptyArray ({ depPath } : DepFileType): boolean {
        return Array.isArray(depPath) && depPath.length > 0;
    }
    function _filterDepFile (data: DepFileType[]): Array<DepFileType> {
        return data.filter(_isEmptyArray);
    }
    const readFileP: Array<Promise<DepFileType>> = _findAllFile(rootPath).map(_collectSingleDep);
    return Promise.all(readFileP).then(_filterDepFile);
}

async function _collectSingleDep(uri:string) {
    const code = await _getFileCode(uri);
    return _getDepByAst(code, uri);
}

let deps:DepFileType[] = [];

async function getDepFile (uri:string) {
    const fileNoExt = uri.substring(0, uri.lastIndexOf('.'));
    if (deps.length === 0) {
        deps = await _collectDep();
    }
    const beDeped:Array<string> = [];
    deps.forEach(({ filePath, depPath }) => {
        if (depPath.indexOf(fileNoExt) !== -1) {
            beDeped.push(filePath);
        }
    });
    return beDeped;    

}
function clearDepFile () {
    deps = [];
}
export {
    clearDepFile,
    getDepFile
};
