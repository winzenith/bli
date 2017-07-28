#!/usr/bin/env node
const exec = require('child_process').exec;
const fs = require('fs-extra')
const path = require('path')
const _ = require('lodash')
const glob = require("glob")
const log = console.log

let filepath_Of_PackageJson = './package.json'

function isPackageJsonFileExist(filepath) {
    return fs.existsSync(filepath)
}

function checkPackageAndInitialize(filepath_Of_PackageJson) {
    return new Promise((resolve, reject) => {
        log('filepath_Of_PackageJson: ',filepath_Of_PackageJson)
        if (!isPackageJsonFileExist(filepath_Of_PackageJson)) {
            log('no package.json found, initializing the file')
            var child = exec('npm init -y', function(err, stdout, stderr) {
                if (err) throw err
                console.log(stdout)
                console.log('done')
                resolve()
            });
        } else {
            // log('no need to init package.json')
            resolve()
        }
    })
}

function readJson() {
    return new Promise((resolve, reject) => {
        let file = require(path.resolve('./package.json'))
        // log(path.resolve('./package.json'))
        let arr_pkgs = []
        for (let key in file.dependencies) {
            arr_pkgs.push(key)
        }
        resolve(arr_pkgs)
    })
}

async function installRequiredPackage(jsfile) {
    await checkPackageAndInitialize(filepath_Of_PackageJson)
    let file = await fs.readFile(`./${jsfile}`, 'utf8').then((file) => file)
    let arr_pkgs = await matchRequiredPackages(file)
    log('1',arr_pkgs)
    let arr_from_pkgs = await readJson()
    log('arr_from_pkgs:',arr_from_pkgs)
    let match_arr = await matchNativePackagesList()
    _.pull(arr_pkgs, ...match_arr)
    _.pull(arr_pkgs, ...arr_from_pkgs)

    let takeout = _.remove(arr_pkgs, function(n) {
        return n.indexOf('./') != -1;
    });
    // log(takeout)
    log('2',arr_pkgs)
    arr_pkgs = _.union(arr_pkgs)
    log('arr_pkgs', arr_pkgs)
    if (arr_pkgs.length > 0) {
        log('installing')
        arr_pkgs.map((elem) => {
            exec('npm install ' + elem + ' -S', (err, stdout, stderr) => {
                if (err) throw err
                log(stdout)
                log(`${elem} has been installed`)
            })
        })
    }

}

let run = async() => {

    var _OPTS = {
        glob: {
            strict: true,
            include: '**/*',
            ignore: ['node_modules/**'],
            nonull: true
        },
        inputDir: path.resolve(__dirname, 'public'),
        outputDir: path.resolve(__dirname, '_prod')
    };

    glob("**/*.js", {
        ignore: _OPTS.glob.ignore
    }, (err, files) => {
        log(files)
        files.map(async(ele, index) => {
            await installRequiredPackage(ele)
            log(`v1正在執行檢查第${index+1}個腳本: ${ele} 所需安裝的packages`)
        })
    })

}
run()

let matchNativePackagesList = () => {
        const natives = process.binding('natives');
        let arr_native_modules = []
        for (var key in natives) {
            if (!(key.indexOf('_') !== 0) | (key.indexOf('/') !== -1)) {
                continue
            }
            // console.log(key);
            arr_native_modules.push(key)
        }
        return arr_native_modules
    }

let matchRequiredPackages = async(fileContent = null) => {
    if (!fileContent) {
        log('empty')
        return
    }
    let text = fileContent
    var pattern = /require\((['"`])([^'"`${}]+)\1\)/gi
    var textArr = text.match(pattern)
    return textArr.map((ele) => {
        let text = (ele.replace(pattern, "$2"))
        return text
    })

}

async function removeSpecifyLine(target_file, matchString) {

    let data_array = target_file.split('\n')

    if (typeof matchString === "object") {
        matchString.map((ele) => {
            for (let i = data_array.length - 1; i > -1; i--) {
                if (!data_array[i]) {
                    continue
                }
                if (data_array[i].match(ele)) {
                    delete data_array[i]
                }

            }
        })
    } else if (typeof matchString === "string") {
        for (let i = data_array.length - 1; i > -1; i--) {
            if (data_array[i].match(matchString)) {
                delete data_array[i];
            }
        }
    }

    log("===========================")
    return data_array.join('\n')
}