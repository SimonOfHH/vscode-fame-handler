import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { XMLParser } from 'fast-xml-parser';
import { saveAsTempFile } from './Helper';

export class NavxHelper {
    private static navxFileIdentifier: Buffer = Buffer.from([78, 65, 86, 88, 40, 0, 0, 0, 2, 0]);
    private static navxRegularPackage: Buffer = Buffer.from([78, 65, 86, 88, 80, 75, 3, 4]);
    private static navxRuntimePackage: Buffer = Buffer.from([78, 65, 86, 88, 46, 78, 69, 65]);
    private _buffer: Buffer;
    private _asJson: any;

    private constructor(input: Buffer) {
        // Handle as Buffer
        this._buffer = input;
        if (!this._buffer) {
            throw Error(`Invalid input`);
        }
        this.parse();
    }
    public static async async(input: Buffer | string): Promise<NavxHelper> {
        let buf: Buffer = Buffer.from([0]);
        if (typeof input === "string") {
            if (fs.existsSync(input) === true) {
                // Handle as filename
                const filename = input;
                let navxFilename: string;
                if (input.toLowerCase().endsWith(".app")) {
                    buf = fs.readFileSync(input);
                    const result = NavxHelper.checkFileValid(filename, buf);
                    if (result[0] === false) {
                        throw Error(result[1]);
                    }
                    const filenameZip = await saveAsTempFile(buf.slice(40), filename, true);
                    navxFilename = await this.extractManifestFromArchive(filenameZip);
                } else {
                    navxFilename = await this.extractManifestFromArchive(filename);
                }
                buf = Buffer.from(fs.readFileSync(navxFilename));
            } else {
                // Handle as XML data as string
                buf = Buffer.from(input);
            }
        }
        return new NavxHelper(buf);
    }
    private static async extractManifestFromArchive(filenameZip: string) {
        const streamZip = require("node-stream-zip");
        const navxFilename = path.join(os.tmpdir(), `'NavxManifest.xml'`);
        const zip = new streamZip.async({ file: filenameZip });
        await zip.extract('NavxManifest.xml', navxFilename);
        await zip.close();
        return navxFilename;
    }
    private parse() {
        const parser = new XMLParser({ ignoreAttributes: false });
        this._asJson = parser.parse(this._buffer);
    }
    public getAppValue(identifier: string) {
        return this._asJson["Package"]["App"][`@_${identifier}`];
    }
    // TODO: Check if other things need to be returned (like IdRanges, InternalsVisibleTo, ...)
    private static checkFileValid(filename: string, buf: Buffer): [boolean, string] {
        console.log(`Checking if ${filename} is an app file.`);
        let errMsg: string = "";
        if (buf.slice(0, 10).compare(NavxHelper.navxFileIdentifier) !== 0) {
            errMsg = `File "${filename}" does not seem to be a valid app file. (File-header mismatch)`;
            return [false, errMsg];
        }
        const packageTypeBuf = buf.slice(36, 44);
        if (packageTypeBuf.compare(NavxHelper.navxRegularPackage) !== 0) {
            if (packageTypeBuf.compare(NavxHelper.navxRuntimePackage) === 0) {
                errMsg = `File "${filename}" is a runtime app file. You can only use regular app files.`;
                return [false, errMsg];
            } else {
                errMsg = `File "${filename}" does not seem to be a valid app file. Please contact developer (weird identifier).`;
                return [false, errMsg];
            }
        }
        return [true, ""];
    }
}