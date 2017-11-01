@extends('layouts.app', ['containerClass' => 'container-fluid'])

@section('title', 'Choice Marketing Partners')

@section('content')

<div class="row pt-0 mobile-hidden mt-neg-60" id="drawer-holder">
    <div class="col-md-12">
        <div class="box box-default b-all p-1 mb-0 pb-0 opac-75">
            <div class="box-content pb-0">
                <ul class="nav nav-pills nav-justified pb-5" id="pill_menu">
                    <li role="presentation">
                        <a href="#agent_testimonials">Agents</a>
                    </li>
                    <li role="presentation">
                        <a href="#customer_testimonials">Customers</a>
                    </li>
                    <li role="presentation">
                        <a href="#incentives">Incentives</a>
                    </li>
                    <li role="presentation">
                        <a href="#clients">Clients</a>
                    </li>
                </ul>
                <p class="text-center m-0 cursor-clickable" id="menu-drawer">
                    <i class="fa fa-chevron-down"></i>
                </p>
            </div>
        </div>
    </div>
</div>

<section class="jumbotron hero" id="hero">
    <div class="container">
        <div class="row">
            <div class="col-md-4 col-md-push-7 get-it b-l-1">
                <h2 class="text-center">Weekly Comma Club</h2>
                <div class="text-center">
                    <p class="p-0 mb-0"><a href="#" class="icon-link" data-commalink="true" data-value="4000">$4,000+</a></p>
                    <p class="p-0 mb-0"><a href="#" class="icon-link" data-commalink="true" data-value="3000">$3,000</a></p>
                    <p class="p-0 mb-0"><a href="#" class="icon-link" data-commalink="true" data-value="2000">$2,000</a></p>
                    <p class="p-0 mb-0"><a href="#" class="icon-link" data-commalink="true" data-value="1000">$1,000</a></p>
                    <p class="p-0 mb-0"><a href="#" class="icon-link" data-commalink="true" data-value="500">$500</a></p>
                </div>
                <br />
                <div class="text-center">
                    <p>
                        Interested in becoming a part of Choice Marketing Partners?
                        <a class="btn btn-primary btn-lg" role="button" href="#" data-toggle="modal" data-target="#modal" data-modaltype="Partner">
                            <i class="fa fa-users"></i> Apply Now
                        </a>
                    </p>
                </div>

            </div>
            <div class="col-md-6 col-md-pull-3">
                <h2 class="hero-font get-it mb-0">Our News</h2>
                {{--<p class="mb-10">You can have everything in life you want, if you will just help other people get what they want.</p>--}}
                {{--<p class="text-right">- Zig Ziglar</p>--}}
                <div class="box box-default h-400 overflow-scroll landing-blog">
                    <div class="box-content overflow-hidden">
                        @include('blog.feed', $posts)
                    </div>
                </div>
            </div>
        </div>
    </div>
</section>

<div class="row section-features" id="incentives">
    <div class="col-md-4 col-md-offset-1">
        <h2>Agent Incentives</h2>
        <h4 class="text-justify" style="line-height:1.4em;">
            Beyond normal salaries and commission opportunities, Choice Marketing Partners strives to be one of the most competitive compensatory energy affiliates in the industry. We believe that if we share profits with our people, they will work harder and be more likely to invest themselves in the organization. We regularly award Agents with daily cash incentives, weekly bonus opportunities through exceptional sales and customer service interactions, and big award contests like all-expense paid vacations, cars and even houses!
        </h4>
    </div>
    <div class="col-md-7">
        <div id="carousel" class="h-200 m-10">
            <div>
                <div class="row icon-features wp-100">
                    <div class="col-xs-4 icon-feature"><i class="fa fa-money fa-5x"></i>
                        <p>Commission & Incentives</p>
                    </div>
                    <div class="col-xs-4 icon-feature"><i class="fa fa-gift fa-5x"></i>
                        <p>Contest Awards</p>
                    </div>
                    <div class="col-xs-4 icon-feature"><i class="fa fa-institution fa-5x"></i>
                        <p>Competitive Comp</p>
                    </div>
                </div>
            </div>
            <div>
                <img src="https://dl.dropboxusercontent.com/s/v33w3mrghedsdeo/20170928_102511.jpg?dl=0" />
            </div>
            <div>
                <img src="https://dl.dropboxusercontent.com/s/395o9rz0i8zt5oh/20170628_113842.jpg?dl=0" />
            </div>
            <div>
                <img src="https://dl.dropboxusercontent.com/s/fdndb58sa5knh6h/20170628_114947.jpg?dl=0" />
            </div>
            <div>
                <img src="https://dl.dropboxusercontent.com/s/y4qk9ufdxwq5sf4/20170628_115437.jpg?dl=0" />
            </div>
        </div>
        <div class="carousel-arrows">
            <ul class="list-inline list-unstyled">
                <li>
                    <i class="fa fa-arrow-circle-o-left fa-2x" id="prevArrow"></i>
                </li>
                <li>
                    <i class="fa fa-arrow-circle-o-right fa-2x" id="nextArrow"></i>
                </li>
            </ul>
        </div>
    </div>
</div>

<div class="row">
    <div class="col-md-6">
        <section class="testimonials" id="agent_testimonials">
            <div class="box box-default b-all">
                <div class="box-title bg-primary">
                    <h2 class="text-center pb-5">Agents</h2>
                </div>
                <div class="box-content h-450 overflow-scroll">
                    <ul class="row list-unstyled">
                        @foreach($agents as $key => $a)
                            <?php $blockquoteClass = ($key % 2 == 0) ? "blockquote-reverse" : "" ?>
                            <li class="col-xs-12">
                                <div class="box box-default">
                                    <div class="box-content">
                                        <blockquote  class="{{$blockquoteClass}}">
                                            <p>{{$a->content}}</p>
                                            <footer>{{$a->location}}</footer>
                                        </blockquote>
                                    </div>
                                </div>
                            </li>
                        @endforeach
                    </ul>
                </div>
            </div>
        </section>
    </div>
    <div class="col-md-6">
        <section class="testimonials" id="customer_testimonials">
            <div class="box box-default b-all">
                <div class="box-title bg-primary">
                    <h2 class="text-center pb-5">Customers</h2>
                </div>
                <div class="box-content h-450 overflow-scroll">
                    <ul class="row list-unstyled">
                        @foreach($customers as $key => $c)
                            <?php $blockquoteClass = ($key % 2 == 0) ? "blockquote-reverse" : "" ?>
                            <li class="col-xs-12">
                                <div class="box box-default">
                                    <div class="box-content">
                                        <blockquote class="{{$blockquoteClass}}">
                                            <p>{{$c->content}}</p>
                                            <footer>{{$c->location}}</footer>
                                        </blockquote>
                                    </div>
                                </div>
                            </li>
                        @endforeach
                    </ul>
                </div>
            </div>
        </section>
    </div>
</div>
<div class="row bg-primary">
    <div class="col-md-12">
        <h2 class="text-center text-uppercase">Partners</h2>
    </div>
</div>
<div class="row">
    <div class="col-md-12 pt-10">
        <section id="clients">
            <div class="row">
                <div class="col-md-10 col-md-offset-1">
                    <div class="row">
                        <div class="col-md-4 text-center hp-100">
                            <a href="https://santannaenergyservices.com/">
                                <img src="{{url('/images/clients/santanna.jpeg')}}" class="img">
                            </a>
                        </div>
                        <div class="col-md-4 text-center hp-100">
                            <a href="https://continuumenergyservices.com/">
                                <img src="{{url('/images/clients/continuum.jpg')}}" class="img">
                            </a>
                        </div>
                        <div class="col-md-4 text-center hp-100">
                            <a href="https://palmcoenergy.com/">
                                <img src="{{url('/images/clients/palmco.jpeg')}}" class="img">
                            </a>
                        </div>
                    </div>
                    <div class="row">
                        <div class="col-md-4 text-center hp-100">
                            <a href="https://www.att.com/">
                                <img src="{{url('/images/clients/att.png')}}" class="img">
                            </a>
                        </div>
                        <div class="col-md-4 text-center hp-100">
                            <a href="https://www.spectrum.com/">
                                <img src="{{url('/images/clients/charter.png')}}" class="img">
                            </a>
                        </div>
                        <div class="col-md-4 text-center hp-100">
                            <a href="https://www.directv.com/">
                                <img src="{{url('/images/clients/directv.png')}}" class="img">
                            </a>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    </div>
</div>
@endsection