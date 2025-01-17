/*
 * GNU AGPL-3.0 License
 *
 * Copyright (c) 2021 - present core.ai . All rights reserved.
 *
 * This program is free software: you can redistribute it and/or modify it
 * under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful, but WITHOUT
 * ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or
 * FITNESS FOR A PARTICULAR PURPOSE. See the GNU Affero General Public License
 * for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with this program. If not, see https://opensource.org/licenses/AGPL-3.0.
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 */

/*jslint vars: true, plusplus: true, devel: true, nomen: true, regexp: true, indent: 4, maxerr: 50 */
/*global define, brackets, fs, Phoenix, path */
//jshint-ignore:no-start

define(function (require, exports, module) {
    const ProjectManager          = brackets.getModule("project/ProjectManager"),
        Strings                   = brackets.getModule("strings"),
        DocumentManager     = brackets.getModule("document/DocumentManager"),
        LiveDevelopment    = brackets.getModule("LiveDevelopment/main"),
        LiveDevServerManager = brackets.getModule("LiveDevelopment/LiveDevServerManager"),
        LivePreviewTransport  = brackets.getModule("LiveDevelopment/MultiBrowserImpl/transports/LivePreviewTransport");

    function getExtension(filePath) {
        filePath = filePath || '';
        let pathSplit = filePath.split('.');
        return pathSplit && pathSplit.length>1 ? pathSplit[pathSplit.length-1] : '';
    }

    function isPreviewableFile(filePath) {
        let extension = getExtension(filePath);
        return isImage(filePath) || _isMarkdownFile(filePath) || _isHTMLFile(filePath) ||
            ['pdf'].includes(extension.toLowerCase());
    }

    function isImage(filePath) {
        let extension = getExtension(filePath);
        return ["jpg", "jpeg", "png", "gif", "svg", "webp", "bmp", "ico", "avif"]
            .includes(extension.toLowerCase());
    }

    function _isMarkdownFile(filePath) {
        let extension = getExtension(filePath);
        return ['md', 'markdown'].includes(extension.toLowerCase());
    }

    function _isHTMLFile(filePath) {
        let extension = getExtension(filePath);
        return ['html', 'htm', 'xhtml'].includes(extension.toLowerCase());
    }

    function getNoPreviewURL(){
        return `${window.Phoenix.baseURL}assets/phoenix-splash/no-preview.html?jsonInput=`+
            encodeURIComponent(`{"heading":"${Strings.DESCRIPTION_LIVEDEV_NO_PREVIEW}",`
                +`"details":"${Strings.DESCRIPTION_LIVEDEV_NO_PREVIEW_DETAILS}"}`);
    }

    function getLivePreviewNotSupportedURL() {
        return `${window.Phoenix.baseURL}assets/phoenix-splash/live-preview-error.html?mainHeading=`+
            encodeURIComponent(`${Strings.DESCRIPTION_LIVEDEV_MAIN_HEADING}`) + "&mainSpan="+
            encodeURIComponent(`${Strings.DESCRIPTION_LIVEDEV_MAIN_SPAN}`);
    }

    function getPageLoaderURL(url) {
        return `${LiveDevServerManager.getStaticServerBaseURLs().baseURL}pageLoader.html?`
            +`broadcastChannel=${LivePreviewTransport.BROADCAST_CHANNEL_ID}&URL=${encodeURIComponent(url)}`;
    }

    function _isLivePreviewSupported() {
        // in safari, service workers are disabled in third party iframes. We use phcode.live for secure sandboxing
        // live previews into its own domain apart from phcode.dev. Since safari doesn't support this, we are left
        // with using phcode.dev domain directly for live previews. That is a large attack surface for untrusted
        // code execution. so we will disable live previews in safari instead of shipping a security vulnerability.
        return Phoenix.browser.isTauri || !(Phoenix.browser.desktop.isSafari || Phoenix.browser.mobile.isIos);
    }

    /**
     * Finds out a {URL,filePath} to live preview from the project. Will return and empty object if the current
     * file is not previewable.
     * @return {Promise<*>}
     */
    async function getPreviewDetails() {
        return new Promise(async (resolve, reject)=>{ // eslint-disable-line
            // async is explicitly caught
            try {
                if(!_isLivePreviewSupported()){
                    resolve({
                        URL: getLivePreviewNotSupportedURL(),
                        isNoPreview: true
                    });
                    return;
                }
                const projectRoot = ProjectManager.getProjectRoot().fullPath;
                const projectRootUrl = `${LiveDevelopment.getLivePreviewBaseURL()}${projectRoot}`;
                const currentDocument = DocumentManager.getCurrentDocument();
                const currentFile = currentDocument? currentDocument.file : ProjectManager.getSelectedItem();
                if(currentFile){
                    let fullPath = currentFile.fullPath;
                    let httpFilePath = null;
                    if(fullPath.startsWith("http://") || fullPath.startsWith("https://")){
                        httpFilePath = fullPath;
                    }
                    if(isPreviewableFile(fullPath)){
                        const filePath = httpFilePath || path.relative(projectRoot, fullPath);
                        let URL = httpFilePath || `${projectRootUrl}${filePath}`;
                        resolve({
                            URL,
                            filePath: filePath,
                            fullPath: fullPath,
                            isMarkdownFile: _isMarkdownFile(fullPath),
                            isHTMLFile: _isHTMLFile(fullPath)
                        });
                        return;
                    }
                }
                resolve({
                    URL: getNoPreviewURL(),
                    isNoPreview: true
                });
            }catch (e) {
                reject(e);
            }
        });
    }

    exports.getPreviewDetails = getPreviewDetails;
    exports.getNoPreviewURL = getNoPreviewURL;
    exports.getExtension = getExtension;
    exports.getPageLoaderURL = getPageLoaderURL;
    exports.isPreviewableFile = isPreviewableFile;
    exports.isImage = isImage;
});


