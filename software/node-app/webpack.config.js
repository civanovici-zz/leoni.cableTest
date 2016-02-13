/**
 * Created by roduino on 2/13/2016.
 */
module.exports = {
    entry: "./app-client.js",
    output: {
        filename: "public/bundle.js"
    },
    devtool: "cheap-module-eval-source-map",
    module: {
        loaders: [
            {
                exclude: /(node_modules|app-server.js)/,
                loader: 'babel'
            }
        ]
    }
};