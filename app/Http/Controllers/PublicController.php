<?php

namespace App\Http\Controllers;

use App\Post;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

class PublicController extends Controller
{
    // MAIN VIEWS

	public function index()
	{
		$user = Auth::user();

		if ($user != null) {
			return view('spa.index', ['user' => $user]);
		}

		$data['customers'] = DB::table('testimonials')->where('testimonial_type', 1)->get();
		$data['agents'] = DB::table('testimonials')->where('testimonial_type', 2)->get();
		$data['posts'] = Post::latest('created_at')->where('active', 1)->paginate(5);

		return view('index', $data);
	}

	public function aboutus()
	{
		return view('about');
	}


	// HELPER

	public function ReturnCommaClubListByID()
	{
		$id = request()->id;
		$hostedURL = 'https://dl.dropboxusercontent.com/s/';

		switch($id){
			case 4000:
				$agents = [
					['James N', $hostedURL . 'cttfhld33lq8cm4/JamesN.jpg?dl=0'],
					['Tony R', $hostedURL . 'TonyR.jpg']
				];
				$title = '$4,000';
				break;
			case 3000:
				$agents = [
                    ['Tiffany Rider', url('images/camera/tiffany_rider_102018.JPG')],
					['Tony R', $hostedURL . 'TonyR.jpg'],
					['James G', $hostedURL . '8boosu6s7nmxsm1/JamesG.jpg?dl=0'],
					['James N', $hostedURL . 'cttfhld33lq8cm4/JamesN.jpg?dl=0'],
					['Stanley G', $hostedURL . 'StanleyG.jpg'],
					['Ron S', $hostedURL . '4d1g2wgwj4c479x/RonaldS.jpeg?dl=0'],
					['Damien J', $hostedURL . '27uovt5l33i9usw/DamienJ.JPG?dl=0', 90]
				];
				$title = '$3,000';
				break;
			case 2000;
				$agents = [
					['Tiffany R', url('images/camera/tiffany_rider_20180825.JPG')],
					['Tony R', $hostedURL . 'TonyR.jpg'],
					['James G', $hostedURL . '8boosu6s7nmxsm1/JamesG.jpg?dl=0'],
					['James N', $hostedURL . 'cttfhld33lq8cm4/JamesN.jpg?dl=0'],
					['Stanley G', $hostedURL . 'StanleyG.jpg'],
					['Leon J', $hostedURL . 'LeonJ.jpg'],
					['Ron S', $hostedURL . '4d1g2wgwj4c479x/RonaldS.jpeg?dl=0'],
					['Aaron K', $hostedURL . 'stm62npvvdvpjzo/AaronK.jpg?dl=0'],
					['Damien J', $hostedURL . '27uovt5l33i9usw/DamienJ.JPG?dl=0', 90],
					['Matt S', $hostedURL . '2bxi2c3gauxe0j8/MathewS.jpg?dl=0']
				];
				$title = '$2,000';
				break;
			case 1000:
				$agents = [
                    ['Donald Carter Jr.', url('images/camera/donald_carter_jr_102018.JPG')],
					['Tony R', $hostedURL . 'TonyR.jpg'],
					['James G', $hostedURL . '8boosu6s7nmxsm1/JamesG.jpg?dl=0'],
					['James N', $hostedURL . 'cttfhld33lq8cm4/JamesN.jpg?dl=0'],
					['Stanley G', $hostedURL . 'StanleyG.jpg'],
					['Ceciel L', $hostedURL . 'CecielL.jpg'],
					['Greg H', $hostedURL . 'GregH.jpg'],
					['Leon J', $hostedURL . 'LeonJ.jpg'],
					['Sarah P', $hostedURL . 'SarahP.jpg'],
					['Toni L', $hostedURL . 'vbrpc0p812u1ccc/ToniL.png?dl=0'],
					['Tina B', $hostedURL . 'TinaB.jpg'],
					['Ron S', $hostedURL . '4d1g2wgwj4c479x/RonaldS.jpeg?dl=0'],
					['Aaron K', $hostedURL . 'stm62npvvdvpjzo/AaronK.jpg?dl=0'],
					['April P', $hostedURL . '6sgwmx4u2b1dys0/AprilP.jpg?dl=0'],
					['Damien J', $hostedURL . '27uovt5l33i9usw/DamienJ.JPG?dl=0', 90],
					['Josh T', $hostedURL . '28ggzit3nrxbiz5/JoshuaT.png?dl=0'],
					['Matt S', $hostedURL . '2bxi2c3gauxe0j8/MathewS.jpg?dl=0'],
					['Tyler T', $hostedURL . 'lqauohqux28stk7/TylerT.jpg?dl=0'],
				];
				$title = '$1,000';
				break;
			default:
				$agents = [
					['Sarah B', $hostedURL . 'SarahB.jpg'],
					['Tony R', $hostedURL . 'TonyR.jpg'],
					['James G', $hostedURL . '8boosu6s7nmxsm1/JamesG.jpg?dl=0'],
					['James N', $hostedURL . 'cttfhld33lq8cm4/JamesN.jpg?dl=0'],
					['James L', $hostedURL . 'vadxr0yp0274w1u/JamesL.jpeg?dl=0'],
					['Stanley G', $hostedURL . 'StanleyG.jpg'],
					['Ceciel L', $hostedURL . 'CecielL.jpg'],
					['Greg H', $hostedURL . 'GregH.jpg'],
					['Leon J', $hostedURL . 'LeonJ.jpg'],
					['Sarah P', $hostedURL . 'SarahP.jpg'],
					['Toni L', $hostedURL . 'vbrpc0p812u1ccc/ToniL.png?dl=0'],
					['Tina B', $hostedURL . 'TinaB.jpgs'],
					['Ron S', $hostedURL . '4d1g2wgwj4c479x/RonaldS.jpeg?dl=0'],
					['Aaron K', $hostedURL . 'stm62npvvdvpjzo/AaronK.jpg?dl=0'],
					['April P', $hostedURL . '6sgwmx4u2b1dys0/AprilP.jpg?dl=0'],
					['Damien J', $hostedURL . '27uovt5l33i9usw/DamienJ.JPG?dl=0', 90],
					['Josh T', $hostedURL . '28ggzit3nrxbiz5/JoshuaT.png?dl=0'],
					['Matt S', $hostedURL . '2bxi2c3gauxe0j8/MathewS.jpg?dl=0'],
					['Chris S', $hostedURL . 'rz6talgzazwjy2g/ChrisS.jpg?dl=0'],
					['Devion S', $hostedURL . 'detyzix6ig7s2zs/DevionS.jpg?dl=0'],
					['Jeff L', $hostedURL . '9v4kwacde590l5n/JeffreyL.jpg?dl=0'],
					['Nancy A', $hostedURL . 'NancyA.jpg'],
					['Torrey W', $hostedURL . 'TorreyW.jpg'],
					['Tracy C', $hostedURL . 'hwy8pck1t6c7slp/TracyC.jpg?dl=0'],
					['Tyler G', $hostedURL . 'vp57n3uq1fc77ns/TylerG.jpg?dl=0'],
					['Tyler H', $hostedURL . 'vp57n3uq1fc77ns/TylerG.jpg?dl=0'],
					['Tyler T', $hostedURL . 'lqauohqux28stk7/TylerT.jpg?dl=0']
				];
				$title = '$500';
				break;
		}

		foreach($agents as $a){
			if(count($a) == 2){
				array_push($a, 0);
			}
		}


		return view('comma.club', ['agents' => $agents, 'title' => $title]);
	}
}
