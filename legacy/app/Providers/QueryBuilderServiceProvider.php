<?php


namespace App\Providers;


use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\ServiceProvider;

class QueryBuilderServiceProvider extends ServiceProvider
{

	public function boot()
	{
		Builder::macro('whereLike', function(string $attribute, string $searchTerm) {
			if (empty($searchTerm)) return $this;
			return $this->where($attribute, 'LIKE', "%{$searchTerm}%");
		});
	}

	public function register()
	{
	}

}