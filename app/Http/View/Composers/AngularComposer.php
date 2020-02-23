<?php

namespace App\Http\View\Composers;

use Illuminate\View\View;


class AngularComposer 
{

    public function __construct()
    {
        
    }

    public function compose(View $view)
    {
        $angular_assets = [
            'main', 'polyfills', 'runtime', 'vendor',
            'main-es5', 'main-es2015', 'polyfills-es5', 'polyfills-es2015', 'runtime-es5',
            'runtime-es2015', 'styles', 'styles-es5', 'styles-es2015', 'vendor-es5', 'vendor-es2015'
        ];

        $file_paths = [];
        $styles = [];

        foreach ($angular_assets as $aa)
        {
            // Angular's output directory in angular.json
            $cmp_path = 'dist/cmp/';

            // If the key is just styles then we are going to build a CSS file path 
            $is_stylesheet = strpos($aa, 'styles') !== false;

            // Check to see if the styles is either of the normal build JS file syntaxes
            $has_js_styles = $is_stylesheet && 
                (strpos($aa, 'styles-es5') !== false || strpos($aa, 'styles-es2015') !== false);

            /**
             * Check if it is a CSS stylesheet based on the check above (this fails when using `--watch`)
             * and if so, build the expected css filename. Otherwise, build the expected JS filename. 
             */
            $path = $is_stylesheet && !$has_js_styles
                ? $cmp_path . $aa . '*.css'
                : $cmp_path . $aa . '*.js';

            // Check to see if we can find the JS/CSS dependency with PHP's glob function
            $p = glob($path);

            /**
             * If running with --watch flag, angular generates a `styles.js` and `styles.js.map` that 
             * we need to catch and account for, because the 2 above paths won't find it. 
             */
            if (strpos($aa, 'styles') !== false && count($p) < 1) 
            {
                $path = $cmp_path . $aa . '*.js';
                $p = glob($path);
            }

            /**
             * Check to make sure that glob found the file we were expecting it to find. 
             * After finding the file, let's check to see if we're working with CSS or JS.
             * Push the path to the correct styles or files array and then specify if we're going 
             * to apply nomodule attributes if it is JS.
             */
            if (is_array($p) && count($p) > 0) 
            {
                if (strpos($path, '.css') !== false)
                {
                    if (!$this->path_exists_in_list($p[0], $styles))
                    {
                        $styles[] = [
                            'path' => $p[0]
                        ];
                    }
                }
                else 
                {
                    if (!$this->path_exists_in_list($p[0], $file_paths))
                    {
                        $file_paths[] = [
                            'path' => $p[0],
                            'is_es5' => strpos($aa, 'es5') !== false
                        ];
                    }
                }
            }
        }
        
        $view->with([
            'file_paths' => $file_paths,
            'styles' => $styles
        ]);
    }

    /**
     * Determines whether the specified path exists in the path arrays used 
     * in this file.
     *
     * @param string $path
     * @param array $array
     * @return bool
     */
    private function path_exists_in_list($path, array $array)
    {
        $exists = false;
        if (!is_array($array)) return true;
        foreach($array as $a)
        {
            if (!is_array($a)) continue;
            if ($exists) return $exists;
            if (array_key_exists('path', $a))
            {
                $exists = $a['path'] === $path;
            }
        }
    }

}