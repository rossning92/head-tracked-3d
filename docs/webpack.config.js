var HtmlWebpackPlugin = require("html-webpack-plugin");
var path = require("path");
module.exports = {
    entry: "./src/index.js",
    resolve: {
        extensions: [".tsx", ".ts", ".js"],
    },
    output: {
        path: path.resolve(__dirname, "./docs"),
        filename: "index_bundle.js",
    },
    plugins: [new HtmlWebpackPlugin()],
    devServer: {
        contentBase: path.join(__dirname, "docs"),
        open: true,
        port: 3000,
        watchContentBase: true,
        hot: true,
    },
    module: {
        rules: [
            {
                test: /\.tsx?$/,
                use: "ts-loader",
                exclude: /node_modules/,
            },
            {
                test: /\.css$/,
                use: ["style-loader", "css-loader"],
            },
            {
                test: /\.(woff|woff2|ttf|eot)$/,
                use: "file-loader?name=fonts/[name].[ext]!static",
            },
        ],
    },
};
