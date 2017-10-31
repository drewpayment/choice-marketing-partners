<?php

namespace App\Http\Controllers;

use App\Comment;
use Illuminate\Database\QueryException;
use Illuminate\Http\Request;

class CommentController extends Controller
{

	/**
	 * Store comment on Post.
	 *
	 * @param Request $request
	 *
	 * @return \Illuminate\Http\RedirectResponse|\Illuminate\Routing\Redirector
	 */
	public function store(Request $request)
	{
		// on_post, from_user, body
		$input['from_user'] = $request->user()->id;
		$input['on_post'] = $request->input('on_post');
		$input['body'] = $request->input('body');

		$slug = $request->input('slug');

		try {

			Comment::create($input);

		} catch (QueryException $e) {

			Session::flash('alert', 'We were unable to save your comment. Please try again later.');

			return redirect()->back()->withInput();
		}

		return redirect()->action('PostController@show', ['slug' => $slug]);
	}

	/**
	 * @param $id
	 *
	 * @return \Illuminate\Http\RedirectResponse
	 */
	public function destroy($id)
	{
		$comment = Comment::find($id);
		if($comment && ($comment->from_user == auth()->user()->id || auth()->user()->role == 'admin'))
		{
			$comment->delete();
			$data['message'] = 'Comment deleted successfully';
		}
		else
		{
			$data['alert'] = 'Invalid operation. You do not have sufficient permissons.';
		}

		return redirect()->back()->with($data);
	}

}
