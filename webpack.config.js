const webpack = require("webpack");
const path = require("path");
const NodePolyfillPlugin = require("node-polyfill-webpack-plugin");

module.exports = {
  mode: "development",
  entry: [
    "./src/js/app.js", "./src/scss/app.scss"
  ],
  output: {
    path: path.resolve(__dirname, "dist/js"),
    filename: "index.js"
  },
  module: {
    rules: [
      {
        test: /\.scss$/,
        use: [
          'style-loader',
          'css-loader',
          'sass-loader'
        ]
      },
    ]
  },
  devServer: {
    static: {
      directory: path.resolve(__dirname, './dist'),
    },
  },
  plugins: [
    new NodePolyfillPlugin({ excludeAliases: ['console'] }),
  ]
};