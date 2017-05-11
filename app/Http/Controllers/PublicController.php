<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class PublicController extends Controller
{
    //


	public function index()
	{
		$customers = DB::table('testimonials')->where('testimonial_type', 1)->get();
		$agents = DB::table('testimonials')->where('testimonial_type', 2)->get();

		return view('index', ['customers' => $customers, 'agents' => $agents]);
	}


	public function ReturnCommaClubListByID()
	{
		$id = request()->id;
		$agents = [];

		switch($id){
			case 4000:
				$agents = [
					['James N', 'http://hostimageurl'],
					['Tony R', 'http://hostimageurl']
				];
				$title = '$4,000';
				break;
			case 3000:
				$agents = [
					['Tony R', 'easdf;ad'],
					['James G', 'doasjdf;ad'],
					['James N', 'asdfjd;sfjsd'],
					['Stanley G', 'adsiuhfpsdo'],
					['Ron S', 'fasdfladilfsd'],
					['Damien J', 'afiduhf;ads']
				];
				$title = '$3,000';
				break;
			case 2000;
				$agents = [
					['Tony R', 'd;ovjda'],
					['James G', 'faiudshf'],
					['James N', ';dsaiuhf;s'],
					['Stanley G', 'asdhf;asdj'],
					['Leon J', 'adsihfidjf;asd'],
					['Ron S', 'sd;aofih;sdoijf'],
					['Aaron K', 'sdiuhfads'],
					['Damien J', 'osadhfds'],
					['Matt S', 'dasifudi;fn;w']
				];
				$title = '$2,000';
				break;
			case 1000:
				$agents = [
					['Tony R', 'd;ovjda'],
					['James G', 'faiudshf'],
					['James N', ';dsaiuhf;s'],
					['Stanley G', 'asdhf;asdj'],
					['Ceciel L', 'dsaiufhlsdi'],
					['Greg H', 'liufasdlifh'],
					['Leon J', 'iuhafdsj'],
					['Sarah P', 'dasihfiajs;d'],
					['Toni L', 'uahd;fsdij;fad'],
					['Tina B', 'asdiuhf;daj'],
					['Ron S', 'liafuhsdlfajs'],
					['Aaron K', 'adslihfiand;'],
					['April P', 'laiuhdfiasd'],
					['Damien J', 'alsiudhfliasu'],
					['Josh T', 'faiuhsdlfas'],
					['Matt S', 'asdiuhfisd'],
					['Tyler T', 'dsailuflsdjf;']
				];
				$title = '$1,000';
				break;
			default:
				$agents = [
					['Sarah B', 'd;ovjda'],
					['Tony R', 'faiudshf'],
					['James G', 'asiludhfadsi;'],
					['James N', ';dsaiuhf;s'],
					['James L', 'iasudhfijas'],
					['Stanley G', 'asdhf;asdj'],
					['Ceciel L', 'dsaiufhlsdi'],
					['Greg H', 'liufasdlifh'],
					['Leon J', 'iuhafdsj'],
					['Sarah P', 'dasihfiajs;d'],
					['Toni L', 'uahd;fsdij;fad'],
					['Tina B', 'asdiuhf;daj'],
					['Ron S', 'liafuhsdlfajs'],
					['Aaron K', 'adslihfiand;'],
					['April P', 'laiuhdfiasd'],
					['Damien J', 'alsiudhfliasu'],
					['Josh T', 'faiuhsdlfas'],
					['Matt S', 'asdiuhfisd'],
					['Tyler T', 'dsailuflsdjf;'],
					['Chris S', 'liaufhds;'],
					['Devion S', ';idsuhafl;dsj'],
					['Jeff L', 'iuhdflasd;'],
					['Josh T', 'sadiufh;asdjf'],
					['Nancy A', 'adsiufhasdoj'],
					['Torrey W', 'aidhuf;saj'],
					['Tracy C', 'iuhadslfs'],
					['Tyler G', 'asdlifhds;'],
					['Tyler H', 'lidhaf;jsd'],
					['Tyler T', 'liuhdaf;ids;d']
				];
				$title = '$500';
				break;
		}

		return view('comma.club', ['agents' => $agents, 'title' => $title]);
	}
}
