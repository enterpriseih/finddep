// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';

import {getDepFile, clearDepFile} from './finddep_v2';
// import getDepFile from './finddep';
// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {

	// Use the console to output diagnostic information (console.log) and errors (console.error)
	// This line of code will only be executed once when your extension is activated
	console.log('Congratulations, your extension "finddep" is now active!');

	// The command has been defined in the package.json file
	// Now provide the implementation of the command with registerCommand
	// The commandId parameter must match the command field in package.json
	let disposableGet = vscode.commands.registerCommand('extension.finddep.getDep', async (uri: any) => {
		// The code you place here will be executed every time your command is executed
		const finddepOutput = vscode.window.createOutputChannel('finddep');
		
		finddepOutput.append(`生成依赖关系中......`);
		finddepOutput.show();

		// Display a message box to the user
		// vscode.window.showInformationMessage('Hello World!');
		const data: string[] = await getDepFile(uri.path);
		finddepOutput.clear();
		if (data.length === 0) {
			finddepOutput.append(`当前文件没有被别的文件引用！`);
		} else {
			finddepOutput.append(`被依赖的文件是：\n${data.join('\n')}`);
		}
		finddepOutput.show();
	});
	context.subscriptions.push(disposableGet);
	let disposableClear = vscode.commands.registerCommand('extension.finddep.clearDep', () => {
		clearDepFile();
		const finddepOutput = vscode.window.createOutputChannel('finddep');
			finddepOutput.appendLine(`清除依赖文件缓存成功！`);
			finddepOutput.appendLine(`请重新查看文件依赖关系！`);
			finddepOutput.show();
	});
	context.subscriptions.push(disposableClear);

}

// this method is called when your extension is deactivated
export function deactivate() {}
