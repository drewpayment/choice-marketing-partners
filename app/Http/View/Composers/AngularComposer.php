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
        
        $files = [];
        
        $file_types = array('js', 'map', 'css');
        $base_path = public_path('dist/cmp');
        
//        $files = ScanDir::scan($base_path, $file_types);
	    $files = ScanDir::scan($base_path);

	    $files = array_map('self::getPublicFilename', $files);

	    $js_files = [];

	    foreach ($files as $file)
	    {
	    	if (str_contains($file, '.css'))
		    {
		    	$styles[] = $file;
		    }
		    else if (str_contains($file, '.js'))
		    {
		    	$js_files[] = $file;
		    }
	    }
        
        $view->with([
            'file_paths' => $js_files,
            'styles' => $styles
        ]);
    }
    
    private function getPublicFilename($full_path) 
    {
        $path_parts = explode('/', $full_path);
        return 'dist/cmp/'.$path_parts[count($path_parts) - 1];
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

class ScanDir {
    static private $directories, $files, $ext_filter, $recursive;
    
    // scan(dirpath::string|array, extensions::string|array, recursive::true|false)
    static public function scan() 
    {
        self::$recursive = false;
        self::$directories = [];
        self::$files = [];
        self::$ext_filter = false;
        
        if (!$args = func_get_args()) {
            die("Must provide a path string or array of path strings");
        }
        if (gettype($args[0]) != "string" && gettype($args[0]) != "array") {
            die("Must provide a path string or array of path strings");
        }
        
        // check if recursive | default action: no subs
        if (isset($args[2]) && $args[2] == true) {
            self::$recursive = true;
        }
        
        // was filter on file extensions included? | default action: return all file types
        if (isset($args[1])) {
            if (gettype($args[1]) == "array") {
                self::$ext_filter = array_map('strtolower', $args[1]);
            } else if (gettype($args[1]) == "string") {
                self::$ext_filter[] = strtolower($args[1]);
            }
        }
        
        // grab path(s)
        self::verifyPaths($args[0]);
        return self::$files;
    }
    
    static private function verifyPaths($paths) 
    {
        $path_errors = [];
        if (gettype($paths) == "string") {
            $paths = array($paths);
        }    
        
        foreach ($paths as $path) {
            if (is_dir($path)) {
                self::$directories[] = $path;
                $dirContents = self::find_contents($path);
            } else {
                $path_errors[] = $path;
            }
        }
        
        if ($path_errors) {
            echo "The following directories do not exist<br />";
            die(var_dump($path_errors));
        }
    }
    
    // how we scan directories 
    static private function find_contents($dir) 
    {
        $result = array();
        $root = scandir($dir);
        foreach ($root as $value) {
            if ($value === '.' || $value === '..') {
                continue;
            }
            
            if (is_file($dir.DIRECTORY_SEPARATOR.$value)) {
                if (!self::$ext_filter || 
                    in_array(strtolower(pathinfo($dir.DIRECTORY_SEPARATOR.$value, PATHINFO_EXTENSION)), self::$ext_filter)) 
                {
                    self::$files[] = $result[] = $dir.DIRECTORY_SEPARATOR.$value;
                }
                continue;
            }
            
            if (self::$recursive) {
                foreach (self::find_contents($dir.DIRECTORY_SEPARATOR.$value) as $value) {
                    self::$files[] = $result[] = $value;
                }
            }
        }    
        
        return $result;
    }
}
