Import("env")
#########################################################################################################################################################
#
# CompressHtml
#
# Todo:
# - 
#
# This script is intended for joining a html-file with its js & css files and then compress it and convert it to Arduino (ESP32/ESP8266) PROGMEM format
#
# It will release you from the burden of uploading a FS-Image or convert html back and forth.
#
# Pro`s:
# - One-compile run
# - Since you can work with ral html-files here, you have only one source of html,
#   which can be debugged by using LIVE-SERVER!!! invsCode, so no need to program the ESP for this.
# - converges html with its javascript and css files and then compresses it for even faster loading
# - Fast & compact, expect compress rates 2-4x as small, for html/js/css.
# - Also other/multiple files can be converted
# - leaves SPIFFS or LittleFs on the ESP intact, so stored data will not be touched.
# - crude //REMOVE  //ENDREMOVE build in for debugging js, this will be stripped by the script.
#
# Cons:
# - takes up progmem space (instead of FS, where this is more efficient actually)
# - static, not a problem in most cases though
# - little need to setup
#
# Setup:
#
# You`ll need:
# - platformIO
# - this script
# - Compress.yml
# - for serving files, refer to the imagenames of the files in include/appdata.h
#
# Of course you also could do other things with this like converting a large lookup table in PROGMEM.
# Use 'live-server' extension to serve your webpage in your html folder from localhost. With some tricks you can
# call to your ESP-api or ws connection then. This will save you compile and upload time when working on your ESP-s webpage.

import os, gzip, re
from datetime import datetime

try:
    import yaml, markdown
    from jsmin import jsmin
    from bs4 import BeautifulSoup
    

except ImportError:
    env.Execute("$PYTHONEXE -m pip install pyyaml Markdown bs4 jsmin")
    import yaml, markdown
    from jsmin import jsmin
    from bs4 import BeautifulSoup

def GetProgMemString(data, progmemName, addendum = "", comment = ""):
    buffer = "\n"
    if (comment != ""):
        buffer += f"// {comment}\n"

    buffer += f'const uint8_t {progmemName + addendum}[] PROGMEM = {{\n'
    bytecount = 0
    for b in data:
        buffer += "0x%02x" % b
        if (bytecount != len(data)-1):
            buffer += ", "
        bytecount +=1
        if ((bytecount % 64) == 0):
            buffer += "\n"
    buffer += "\n};\n"
    return buffer

def SubstituteCssLinks(htmlData, basedir):
    cssLinks = re.findall("<link .+?>", htmlData)
    totalCssFilesSize = 0
    for cssLink in cssLinks:
        cssFilePath = f'{basedir}/' + re.findall("href=\"(.+?)\"",cssLink)[0]
        if cssFilePath.lower().startswith("https://") or cssFilePath.lower().startswith("http://"):
            continue
        print (f" add css-link: {cssLink} ({cssFilePath})")
        cssFile = open(cssFilePath, "r")
        cssFileContent = cssFile.read()
        totalCssFilesSize += len(cssFileContent)
        cssFileContent = CleanCss(cssFileContent)
        replaceCssLinkBuffer = "\n<style>\n"
        replaceCssLinkBuffer += cssFileContent
        replaceCssLinkBuffer += "\n</style>\n"
        htmlData = htmlData.replace(cssLink, replaceCssLinkBuffer)
    return (htmlData, totalCssFilesSize)

def RemoveJSRemoves(htmlData):      # remove everything between // REMOVE and // ENDREMOVE, preprocessor-like
    toRemoves = re.findall("\/\/\s?REMOVE.+?\/\/\s?ENDREMOVE", htmlData, re.DOTALL) 
    for toRemove in toRemoves:
        htmlData = htmlData.replace(toRemove,"")
    return htmlData

def CleanJsFile(js_code):
    return jsmin(js_code)

def CleanCss(css_code):
    # Step 1: Remove all multi-line comments (/* ... */)
    pattern_comments = r'/\*[\s\S]*?\*/'
    css_code_no_comments = re.sub(pattern_comments, '', css_code)
    
    # Step 2: Remove leading/trailing spaces, tabs, and newlines
    # This removes excess spaces around { } : ; , but keeps necessary spaces
    css_code_minified = re.sub(r'\s*([{}:;,])\s*', r'\1', css_code_no_comments)
    
    # Step 3: Remove any remaining unnecessary whitespace characters (newlines, tabs)
    css_code_minified = re.sub(r'\s+', ' ', css_code_minified).strip()
    
    return css_code_minified

def SubstituteJsLinks(htmlData, basedir):
    jsLinks = re.findall("<script.+?src=\".+?.js\"></script>", htmlData)
    totalJsFilesSize = 0
    for jsLink in jsLinks:
        jsFilePath = f'{basedir}/' + re.findall(" src=\"(.+?)\"",jsLink)[0]
        if jsFilePath.lower().startswith("https://") or jsFilePath.lower().startswith("http://"):
            continue
        print (f" add js-link: {jsLink} ({jsFilePath})")
        jsFile = open(jsFilePath, "r")
        jsFileContent = jsFile.read()
        totalJsFilesSize += len(jsFileContent)
        jsFileContent = RemoveJSRemoves(jsFileContent)
        jsFileContent = CleanJsFile(jsFileContent)

        replaceJsLinkBuffer = "\n<script>\n"
        replaceJsLinkBuffer += jsFileContent
        replaceJsLinkBuffer += "\n</script>\n"
        htmlData = htmlData.replace(jsLink, replaceJsLinkBuffer)
    return (htmlData, totalJsFilesSize)

def ReadAndCreateGetProgMemString(filename):
    if (os.path.isfile(filename) == False):
        print(f"\nFile: {filename} was not found...\n")
        return ""
    inFile = open(filename, "rb")
    inData = inFile.read()
    return GetProgMemString(inData, filename.split("/")[-1].replace(".","_"))

def GetTxtFile(filename):
    print (f'processing file: {filename}')
    with open(filename, "r") as file:
        return file.read()
    
def GetBinFile(filename):
    print (f'processing file: {filename}')
    with open(filename, "rb") as file:
        return file.read()

def FileHeader():
    header = f'// This file is auto-generated by CompressHtml.py @{datetime.now().strftime("%d/%m/%Y %H:%M:%S")}\n'
    header += "// Do not edit, since it will be overwritten\n\n" 
    header += "#include <Arduino.h>\n"
    return header

def GzCompressText(data):
    outData = gzip.compress(bytes(data, "UTF-8"))
    return outData

def GzCompressBin(data):
    return gzip.compress(data)

def ProgMemNameFromFileName(filename):
    return filename.split("/")[-1].replace(".","_")

def GetCompressionReport(filename, inSize, outSize):
    return f"Processed: {filename}, compressed with gzip, insize: {inSize} bytes, compressed: {outSize} bytes ({round(outSize*100/inSize,1)}%)."

def cleanHtml(htmlData):
    soup = BeautifulSoup(htmlData, "html.parser")
    for element in soup.find_all(text=True):
        if element.parent.name not in ["style", "script"]:
            # Clean up whitespace in the element text
            element.replace_with(element.strip())
    return str(soup)

def processHtml(filename, basedir):
    HtmlData = GetTxtFile(filename)
    htmlFileSize = len(HtmlData)
    HtmlData = cleanHtml(HtmlData)
    (HtmlData, totalJsFileSize) = SubstituteJsLinks(HtmlData, basedir)
    (HtmlData, totalCssFilesSize) = SubstituteCssLinks(HtmlData, basedir)
    BinGzHtmlData = GzCompressText(HtmlData)
    inSize = htmlFileSize + totalJsFileSize + totalCssFilesSize
    outSize = len(BinGzHtmlData)
    comment = GetCompressionReport(filename, inSize, outSize)
    print(comment)
    return GetProgMemString(BinGzHtmlData,ProgMemNameFromFileName(filename + "_gz"), "", comment)

def processMD(filename):
    mdData = GetTxtFile(filename)
    html_md_content = markdown.markdown(mdData)
    inSize = len(html_md_content)
    BinGzMdData = GzCompressText(html_md_content)
    if inSize == 0: return ""
    outSize = len(BinGzMdData)
    comment = GetCompressionReport(filename, inSize, outSize)
    print(comment)
    return GetProgMemString(BinGzMdData,ProgMemNameFromFileName(filename + "_html_gz"), "", comment)

def processOtherGz(filename):
    BinData = GetBinFile(filename)
    BinGzData = GzCompressBin(BinData)
    inSize = len(BinData)
    outSize = len(BinGzData)
    comment = GetCompressionReport(filename, inSize, outSize)
    print(comment)
    return GetProgMemString(BinGzData,ProgMemNameFromFileName(filename + "_gz"),"" , comment)

def ProcessOther(filename):
    BinData = GetBinFile(filename)
    print(f" Size in: {len(BinData)} (no compression).")
    comment = f"This is {filename}, not compressed, size: {len(BinData)}."
    return GetProgMemString(BinData,ProgMemNameFromFileName(filename), "", comment)


# main:

print("\n**************** Compress.py start ****************\n")

with open('tools/Compress.yml', 'r') as file:
    ymlConfig = yaml.safe_load(file)

print("Config: Compress.yml was red.")

headerFileData = FileHeader()

for file in ymlConfig["HTML"]:
    headerFileData += processHtml(ymlConfig["SOURCEDIR"] + "/" + file, ymlConfig["SOURCEDIR"])

for file in ymlConfig["MARKDOWN"]:
    headerFileData += processMD(file)

for file in ymlConfig["OTHERSGZ"]:
    headerFileData += processOtherGz(ymlConfig["SOURCEDIR"] + "/" + file)

for file in ymlConfig["OTHERS"]:
    headerFileData += ProcessOther(ymlConfig["SOURCEDIR"] + "/" + file)

with open(ymlConfig["DESTINATIONFILE"], "w") as outfile:
    outfile.write(headerFileData)

print("\n**************** Compress.py end ****************\n")

