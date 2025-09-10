<?php

namespace App\Http\Controllers;

use App\Http\Requests\PostFormRequest;
use App\Post;
use Illuminate\Database\QueryException;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Session;

class PostController extends Controller
{

	/**
	 * Main view for posts
	 *
	 * @return \Illuminate\Contracts\View\Factory|\Illuminate\View\View
	 */
	public function index()
    {
    	// fetch 5 posts from database which are active and latest
	    $posts = Post::latest('created_at')->where('active', 1)->paginate(5);

	    // page heading
	    $title = '<i class="fa fa-quote-right"></i> &nbsp;Recent Posts';

	    // return home.blade.php template from resources/blog/views folder
	    return view('blog.home', ['posts' => $posts, 'title' => $title]);
    }

	/**
	 * Return the view to create a new post or redirect if the user is not allowed to create posts.
	 *
	 * @param Request $request
	 *
	 * @return $this|\Illuminate\Contracts\View\Factory|\Illuminate\View\View
	 */
	public function create(Request $request)
    {
    	// can user post
	    if(auth()->user()->can_post())
	    {
	    	return view('blog.create');
	    }
	    else
	    {
	    	return redirect('/')->withErrors('You do not have sufficient permissions.');
	    }
    }

	/**
	 * Store post and return confirmation message.
	 *
	 * @param Request $request
	 *
	 * @return \Illuminate\Http\RedirectResponse|\Illuminate\Routing\Redirector
	 */
	public function store(Request $request)
    {
    	$post = new Post;
    	$post->title = $request->title;
    	$post->body = $request->body;
    	$post->slug = str_slug($post->title);
    	$post->author_id = auth()->user()->id;

    	if($request->has('save'))
	    {
	    	$post->active = 0;
	    	$message = 'Post saved successfully';
	    }
	    else
	    {
	    	$post->active = 1;
	    	$message = 'Post published successfully';
	    }

	    try {
		    $post->save();
	    } catch (QueryException $e) {
    		Session::flash('alert', 'A duplicate named post already exists. Please try again.');

    		return redirect()->back()->withInput();
	    }

    	return redirect()->action('PostController@edit', ['slug' => $post->slug])->with('message', $message);
    }

	/**
	 * Show single post with comments.
	 *
	 * @param $slug
	 *
	 * @return \Illuminate\Contracts\View\Factory|\Illuminate\Http\RedirectResponse|\Illuminate\Routing\Redirector|\Illuminate\View\View
	 */
	public function show($slug)
    {
    	$data['post'] = Post::where('slug', $slug)->first();

    	if(!$data['post'])
	    {
	    	return redirect('blog', ['errors' => 'request page not found.']);
	    }

	    $data['comments'] = $data['post']->comments->where('active', 1);

    	if(Auth::check() && auth()->user()->is_admin())
	    {
	    	$data['pending_comments'] = $data['post']->comments->where('active', 0)->count();
	    }


	    return view('blog.show', $data);
    }

	/**
	 * View existing post in order to edit.
	 *
	 * @param $slug
	 *
	 * @param $message
	 *
	 * @return \Illuminate\Contracts\View\Factory|\Illuminate\Http\RedirectResponse|\Illuminate\Routing\Redirector|\Illuminate\View\View
	 * @internal param Request $request
	 */
	public function edit($slug)
    {
    	$post = Post::where('slug', $slug)->first();

    	if($post && (auth()->user()->id == $post->author_id || auth()->user()->is_admin()))
    		return view('blog.edit', [
    			'post' => $post,
			    'message' => request()->get('message'),
			    'title' => 'Edit Post'
		    ]);

    	return redirect('blog', ['errors' => 'You do not have sufficient permissions.']);
    }

	/**
	 * Edit existing post.
	 *
	 * @param Request $request
	 *
	 * @return \Illuminate\Http\RedirectResponse|\Illuminate\Routing\Redirector
	 */
	public function update(Request $request)
    {
    	$post_id = $request->input('post_id');
    	$post = Post::find($post_id);

    	if($post && ($post->author_id == auth()->user()->id || auth()->user()->is_admin()))
	    {
	    	$title = $request->input('title');
	    	$slug = str_slug($title);
	    	$duplicate = Post::where('slug', $slug)->first();

	    	if($duplicate)
		    {
		    	if($duplicate->id != $post_id)
			    {
			    	Session::flash('errors', 'Title already exists.');

			    	return redirect()->action('PostController@edit', ['slug' => $post->slug])->withInput();
			    }
			    else
			    {
			    	$post->slug = $slug;
			    }
		    }

		    $post->title = $title;
	    	$post->body = $request->input('body');

	    	if($request->has('save'))
		    {
		    	$post->active = 0;
		    	$message = 'Post saved successfully';
		    }
		    else
		    {
		    	$post->active = 1;
		    	$message = 'Post updated successfully';
		    }

		    try {
			    $post->save();
		    } catch (QueryException $e) {
	    		Session::flash('alert', 'We were unable to save your post. Please try again. If the issue persists, please contact your administrator.');

	    		return redirect()->back()->withInput();
		    }

	    	return redirect()->action('PostController@edit', ['slug' => $post->slug])->with('message', $message);
	    }
	    else
	    {
	    	return redirect()->back()->with(['alert' => 'You do not have sufficient permission']);
	    }
    }

	/**
	 * Delete existing post.
	 *
	 * @param Request $request
	 * @param $id
	 *
	 * @return \Illuminate\Http\RedirectResponse
	 */
	public function destroy(Request $request, $id)
    {
    	$post = Post::find($id);
    	if($post && ($post->author_id == auth()->user()->id || auth()->user()->is_admin()))
	    {
	    	$post->delete();
	    	$data['message'] = 'Post deleted successfully';
	    }
	    else
	    {
	    	$data['errors'] = 'Invalid operation. You do not have sufficient permission';
	    }

	    return redirect('/blog')->with($data);
    }
}
