<?php

namespace App\Http\Controllers;

use App\Comment;
use Illuminate\Database\QueryException;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\View;

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
		$input['active'] = 0;

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


	/**
	 * @return \Illuminate\Contracts\View\Factory|\Illuminate\View\View
	 */
	public function pendingComments()
	{
		$data['title'] = '<i class="fa fa-thumbs-o-up"></i> Pending Comment Approvals';
		$data['comments'] = Comment::where('active', 0)->get();

		return view('blog.approvals', $data);
	}


	/**
	 * Approve pending comment.
	 *
	 * @param $id
	 *
	 * @return \Illuminate\Http\JsonResponse
	 */
	public function approveComment($id)
	{
		$comment = Comment::find($id);
		$comment->active = 1;

		try{
			$comment->save();
		} catch (QueryException $e) {
			return response()->json(false, 500);
		}

		return response()->json(true);
	}


	/**
	 * Return HTML partial of pending comments for approval
	 *
	 * @return \Illuminate\Http\JsonResponse
	 */
	public function refreshCommentApprovals()
	{
		if(!Auth::check() || !Auth::user()->is_admin())
			return response()->json(false, 500);

		$data['comments'] = Comment::where('active', 0)->get();

		$view = View::make('blog.partials._pendingComments', $data)->render();

		return response()->json($view);
	}

}
