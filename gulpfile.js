var elixir = require('laravel-elixir');

require('laravel-elixir-livereload');

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

    mix.livereload();

    mix.less([
        'pdfwrapper.less'
    ], 'assets/pdfs/wrapper.css');

    mix.sass('app.scss');
    mix.copy('node_modules/animate.css/animate.min.css', 'public/css/animate.min.css');

    mix.styles([
        '../../../public/css/*/*.css'
        // '../../../public/css/user.css',
        // '../../../public/css/normalize.css',
        // '../../../public/css/app.css',
        // '../../../public/css/custom.css'
    ]);

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
        'dashboard.js'
	]);

    mix.version(['js/all.js', 'css/all.css']);


});
