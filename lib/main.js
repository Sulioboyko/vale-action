"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
    result["default"] = mod;
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
const core = __importStar(require("@actions/core"));
const tmp = __importStar(require("tmp"));
const execa = require("execa");
const input = __importStar(require("./input"));
/**
 * These environment variables are exposed for GitHub Actions.
 *
 * See https://bit.ly/2WlFUD7 for more information.
 */
const { GITHUB_TOKEN, GITHUB_WORKSPACE } = process.env;
function run(actionInput) {
    return __awaiter(this, void 0, void 0, function* () {
        const alertResp = yield execa('vale', actionInput.args);
        // NOTE: GitHub Actions currently only support 'warning' and 'error', so we
        // convert 'suggestion' to 'warning'.
        //
        // TODO: Is there a better way to handle this?
        var converted = alertResp.stdout.replace(/suggestion/g, 'warning');
        if (converted.length == 0) {
            converted = alertResp.stderr.replace(/suggestion/g, 'warning');
        }
        core.info(converted);
    });
}
exports.run = run;
function main() {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const userToken = GITHUB_TOKEN;
            const workspace = GITHUB_WORKSPACE;
            const tmpobj = tmp.fileSync({ postfix: '.ini', dir: workspace });
            const actionInput = yield input.get(tmpobj, userToken, workspace);
            yield run(actionInput);
            tmpobj.removeCallback();
        }
        catch (error) {
            core.setFailed(error.message);
        }
    });
}
main();
