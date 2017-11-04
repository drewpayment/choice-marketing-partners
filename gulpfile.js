var elixir = require('laravel-elixir');
var path = require('path');

/*
 |--------------------------------------------------------------------------
 | Elixir Asset Management
 |--------------------------------------------------------------------------
 |
 | Elixir provides a clean, fluent API for defining some basic Gulp tasks
 | for your Laravel application. By default, we are compiling the Sass
 | file for our application, as well as publishing vendor resources.
 |
 */

elixir(function(mix) {

    // mix.livereload();

    mix.less([
        'pdfwrapper.less'
    ], 'assets/pdfs/wrapper.css');

    mix.styles([
        '../../../public/css/*/*.css'
    ]);

    mix.sass('app.scss');
    mix.copy('node_modules/animate.css/animate.min.css', 'public/css/animate.min.css');

    mix.less([
        'custom.less',
        'selectize.less',
        'selectize.default.less'
    ]);

    mix.scripts([
        'welcome.js',
        'paystubs.js',
    	'employees.js',
        'upload.js',
        'custom.js',
        'dashboard.js',
        'home.js',
        'approvals.js'
	]);

    /**
    * Compiles and minifies abstracted JS into one file.
    *
    */
    mix.scripts([
        'conf/employee.js'
    ], 'public/js/conf/all.js');

    // mix.webpack('./vue/app.js', require('./webpack.config.js'), 'public/build/vue', 'resources/assets/js/vue');

    mix.version(['js/all.js', 'css/all.css', 'js/conf/all.js']);

});
