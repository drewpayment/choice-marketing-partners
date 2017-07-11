@extends('layouts.app')

@section('title', 'Choice Marketing Partners')

@section('content')

<div class="row pt-0 mobile-hidden">
    <div class="col-md-12">
        <div class="row">
            <div class="col-xs-1">
                <i class="fa fa-3x fa-plus-circle cursor-clickable pull-right" id="show-all" style="display:none;"></i>
            </div>
            <div class="col-xs-10">
                <div class="box box-default b-all p-1 opac-75">
                    <div class="box-content">
                        <ul class="nav nav-pills nav-justified" id="pill_menu">
                            <li class="cursor-clickable" role="presentation">
                                <a href="#" data-target="agent_testimonials">Agents</a>
                            </li>
                            <li class="cursor-clickable" role="presentation">
                                <a href="#" data-target="customer_testimonials">Customers</a>
                            </li>
                            <li class="cursor-clickable" role="presentation">
                                <a href="#" data-target="incentives">Incentives</a>
                            </li>
                            <li class="cursor-clickable" role="presentation">
                                <a href="#" data-target="clients">Clients</a>
                            </li>
                            {{--<li role="presentation">--}}
                            {{--<a href="#" data-target="#locations">Locations</a>--}}
                            {{--</li>--}}
                            {{--<li role="presentation">--}}
                            {{--<a href="#" data-target="#blog">Blog</a>--}}
                            {{--</li>--}}
                        </ul>
                    </div>
                </div>
            </div>
        </div>
    </div>
</div>

<section class="jumbotron hero" id="hero">
    <div class="container">
        <div class="row">
            <div class="col-md-4 col-md-push-7 get-it b-l-1">
                <h2>Weekly Comma Club</h2>
                <div class="text-center">
                    <p class="p-0 mb-0"><a href="#" class="icon-link" data-commalink="true" data-value="4000">$4,000+</a></p>
                    <p class="p-0 mb-0"><a href="#" class="icon-link" data-commalink="true" data-value="3000">$3,000</a></p>
                    <p class="p-0 mb-0"><a href="#" class="icon-link" data-commalink="true" data-value="2000">$2,000</a></p>
                    <p class="p-0 mb-0"><a href="#" class="icon-link" data-commalink="true" data-value="1000">$1,000</a></p>
                    <p class="p-0 mb-0"><a href="#" class="icon-link" data-commalink="true" data-value="500">$500</a></p>
                </div>
            </div>
            <div class="col-md-6 col-md-pull-3 get-it">
                <h2>Marketing Strategists</h2>
                <p class="mb-10">You can have everything in life you want, if you will just help other people get what they want.</p>
                <p class="text-right">- Zig Ziglar</p>
                <p><a class="btn btn-primary btn-lg" role="button" href="#" data-toggle="modal" data-target="#modal" data-modaltype="Partner"><i class="fa fa-users"></i> Apply Now</a></p>
            </div>
        </div>
    </div>
</section>
<section class="features" id="incentives">
    <div class="container">
        <div class="row">
            <div class="col-md-4">
                <h2>Agent Incentives</h2>
                <p>
                    Beyond normal salaries and commission opportunities, Choice Marketing Partners strives to be one of the most competitive compensatory energy affiliates in the industry. We believe that if we share profits with our people, they will work harder and be more likely to invest themselves in the organization. We regularly award Agents with daily cash incentives, weekly bonus opportunities through exceptional sales and customer service interactions, and big award contests like all-expense paid vacations, cars and even houses!
                </p>
            </div>
            <div class="col-md-8">
                <div id="carousel" class="h-200 m-10">
                    <div>
                        <div class="row icon-features">
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
        <div class="row pt-10">
            <div class="col-md-6">
                <div class="yt-vid-container">
                    <iframe class="yt-vid-responsive" src="https://www.youtube.com/embed/mhQy_QsUz08?rel=0&amp;controls=0" frameborder="0" allowfullscreen></iframe>
                </div>
            </div>
            <div class="col-md-6">
                <div class="yt-vid-container">
                    <iframe class="yt-vid-responsive" src="https://www.youtube.com/embed/AskrLet35Fs?rel=0&amp;controls=0" frameborder="0" allowfullscreen></iframe>
                </div>
            </div>
        </div>
    </div>
</section>
<section class="testimonials" id="agent_testimonials">
    <div class="box box-default b-all">
        <div class="box-title">
            <h2 class="text-center pb-5">What our Agents say about Us</h2>
        </div>
        <div class="box-content">
            <ul class="row list-unstyled">
                @foreach($agents as $a)
                    <li class="col-xs-12">
                        <div class="box box-primary">
                            <div class="box-content">
                                <blockquote>
                                    {{$a->content}}
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
<section class="testimonials" id="customer_testimonials">
    <div class="box box-default b-all">
        <div class="box-title">
            <h2 class="text-center pb-5">What our Customers say about Us</h2>
        </div>
        <div class="box-content">
            <ul class="row list-unstyled">
                @foreach($customers as $c)
                    <li class="col-xs-12">
                        <div class="box box-primary">
                            <div class="box-content">
                                <blockquote>
                                    {{$c->content}}
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
<section id="clients">
    <div class="container">
        <div class="row">
            <div class="box box-default b-all">
                <div class="box-title">
                    <h2 class="text-center">Clients We Work With</h2>
                </div>
                <div class="box-content">
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
        </div>
    </div>
</section>
@endsection

@section('scripts')
    <script src="https://cdn.jsdelivr.net/jquery.slick/1.6.0/slick.min.js"></script>
    <script type="text/javascript">
        $(function(){
            $('#carousel').slick({
                autoplay: true,
                autoplaySpeed: 3000,
                appendArrows: $('.carousel-arrows'),
                prevArrow: $('#prevArrow'),
                nextArrow: $('#nextArrow')
            });
        });

        $(function(){
           var elems = $('#pill_menu').find('a[href]');
           $(elems).on('click', function(){
               var sections = $('section:visible');
               var target = '#' + $(this).data('target');
               if($(target).is(':visible')){
                   $(sections).not(target).slideToggle(500, function() { setShowAllButton(); });
                   if(sections.not(target).length < 1){
                       $('#hero, #agent_testimonials, #customer_testimonials, #incentives, #clients').not(target).slideToggle(500, function() {setShowAllButton();});
                   }
               } else if($(sections).length){
                   $(sections).slideToggle(500, function(){setShowAllButton();});
                   $(target).slideToggle(500, function(){setShowAllButton();});
               }

           });

           $('#show-all').on('click', function(){
                var shown = $('section:visible');
                $('#hero, #agent_testimontials, #customer_testimonials, #incentives, #clients').not(shown).slideToggle(500, function(){setShowAllButton();});
           });
        });

        var setShowAllButton = function(){

            if($('#hero:visible').length) {
                $('#show-all').fadeOut();
            } else {
                $('#show-all').fadeIn();
            }
        };

        $('#modal').on('hidden.bs.modal', function(){
            $('#modal').removeData();
        }).on('show.bs.modal', function(e){
            var button = $(e.relatedTarget);
            var modalType = button.data('modaltype');

            var modal = $(this);
            modal.find('.modal-title').text('Become our ' + modalType + ' today!');
        });

        $(document).on('click', '#sender-btn', function(e){
            e.stopPropagation();
            var modalForm = getModalForm();

            var options = {
                url: '/sendmodal',
                type: 'POST',
                dataType: 'JSON',
                data: {
                    form: modalForm
                },
                afterData: afterData
            };

            fireAjaxRequest(options);

            function afterData(data){
                if(data){
                    setMessageContainer('Sent!');
                    $('#modal').modal('hide');
                } else {
                    setMessageContainer('Something went wrong!');
                    $('#modal').modal('hide');
                }
            }
        });

        var getModalForm = function(){
            var form = $('#EMAIL_FORM');
            return {
                name: form.find('#sender-name').val(),
                phone: form.find('#sender-phone').val(),
                email: form.find('#sender-email').val(),
                message: form.find('#sender-msg').val()
            }
        };

        function commaImageError(img){

            img.onerror = '';
            img.src = '/images/nouserimage.png';
            return true;
        }

    </script>

@endsection