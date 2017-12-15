<?php

namespace App\Http\Controllers;

use App\Post;
use App\User;
use Illuminate\Http\Request;

class BlogUserController extends Controller
{

	/**
	 * @param $id
     *
     * @return \Illuminate\Contracts\View\Factory|\Illuminate\View\View
     */
    public function user_posts($id = -1)
    {
        $id = ($id > -1) ? $id : auth()->user()->id;
        $posts = Post::where('author_id', $id)->where('active', 1)->orderBy('created_at', 'desc')->paginate(5);
        $title = User::userId($id)->first()->name;

        return view('blog.home', ['posts' => $posts, 'title' => $title]);
    }

    /**
     * @param Request $request
     *
     * @return \Illuminate\Contracts\View\Factory|\Illuminate\View\View
     */
    public function user_posts_all(Request $request)
    {
        $user = $request->user();
        $posts = Post::where('author_id', $user->id)->orderBy('created_at', 'desc')->paginate(5);
        $title = $user->name;

        return view('blog.home', ['posts' => $posts, 'title' => $title]);
    }

    /**
     * @param Request $request
     *
     * @return \Illuminate\Contracts\View\Factory|\Illuminate\View\View
     */
    public function user_posts_draft(Request $request)
    {
        $user = $request->user();
        $posts = Post::where('author_id', $user->id)->where('active', 0)->orderBy('created_at', 'desc')->paginate(5);
        $title = $user->name;

        return view('blog.home', ['posts' => $posts, 'title' => $title]);
    }

    public function profile(Request $request, $id)
    {
        $data['user'] = User::userId($id)->first();

        if(!$data['user'])
            return redirect('/blog');

        if(auth()->user() && $data['user']->id == auth()->user()->id)
        {
            $data['author'] = true;
        }
        else
        {
            $data['author'] = null;
        }

        $data['comments_count'] = $data['user']->comments->count();
        $data['posts_count'] = $data['user']->posts->count();
        $data['posts_active_count'] = $data['user']->posts->where('active', 1)->count();
        $data['posts_draft_count'] = $data['posts_count'] - $data['posts_active_count'];
        $data['latest_posts'] = $data['user']->posts->where('active', 1)->take(5);
        $data['latest_comments'] = $data['user']->comments->take(5);

        return view('blog.user.profile', $data);
    }
}
