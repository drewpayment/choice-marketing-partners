<?php

namespace App;

use Conner\Tagging\Taggable;
use Illuminate\Database\Eloquent\Model;

class Link extends Model
{
    use Taggable;

    protected $table = 'links';
}
