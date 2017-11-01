<?php
/**
 * Created by PhpStorm.
 * User: drewpayment
 * Date: 10/22/17
 * Time: 8:56 PM
 */

namespace App\Http\Requests;

use Illuminate\Http\Request;

class PostFormRequest extends Request {

	/**
	 * Determine if the user is authorized to make this request.
	 *
	 * @return bool
	 */
	public function authorize()
	{
		return ($this->user()->can_post());
	}

	/**
	 * Get the validation rules that apply to the request.
	 *
	 * @return array
	 */
	public function rules()
	{
		return [
			'title' => 'required|unique:posts|max:255',
			'title' => array('Regex:/^[A-Aa-z0-9 ]+$/'),
			'body' => 'required'
		];
	}

}