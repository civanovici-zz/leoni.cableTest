// webpack.config.js
var path = require('path');
var fs = require('fs');
var webpack = require('webpack');

module.exports = {
  context: __dirname + '/src',
  entry: './entry.js',

  output: {
    filename: 'bundle.js',
    path: __dirname + '/build'
  },

  module: {
    loaders: [
      { 
        test: /\.js$/, 
        loader: 'babel-loader', 
        exclude: /node_modules/ ,
        query: {
          presets: ['es2015', 'react']
        }
      }
    ]
  },
  
  resolve: {
    root: path.join(__dirname),
    fallback: path.join(__dirname, 'node_modules'),
    modulesDirectories: ['node_modules'],
  }
};