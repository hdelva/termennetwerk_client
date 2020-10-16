const path = require("path");
const webpack = require('webpack');

const browserConfig = {
    entry: "./src/index.ts",
    devtool: "source-map",//"cheap-module-source-map",
    module: {
        rules: [
            {
                test: /\.ts$/,
                use: "ts-loader",
                exclude: /node_modules/
            }
        ],
    },
    resolve: {
        extensions: [".ts", ".js"],
        alias: {
            "q": path.resolve(__dirname, "webpack/shimQ.js")
        }
    },
    output: {
        filename: "bundle.js",
        path: path.resolve(__dirname, "dist"),
        library: "TreeComplete",
        libraryTarget: "umd",
        libraryExport: "default"
    }
};

module.exports = browserConfig;
