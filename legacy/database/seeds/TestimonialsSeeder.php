<?php

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class TestimonialsSeeder extends Seeder
{
    /**
     * Run the database seeds.
     *
     * @return void
     */
    public function run()
    {
    	$date = date('Y-m-d H:i:s');
	    DB::table('testimonials')->insert([
		    ['content' => 'My sales representative was great. I was originally pretty reluctant, but she addressed all of my concerns about the service and made sure that all of my questions were thoroughly answered. She was extremely genuine and I felt like she had my best intentions in mind throughout the entire process.', 'location' => 'Bay City, MI', 'testimonial_type' => 1, 'created_at' => date('Y-m-d H:i:s'), 'updated_at' => date('Y-m-d H:i:s')],
		    ['content' => 'Thank you, thank you, thank you! Every dollar counts, and especially during the holidays. Bless you for taking the time to analyze my situation and finding me additional savings I didn\'t even know was possible!', 'location' => 'Chicago, IL', 'testimonial_type' => 1, 'created_at' => date('Y-m-d H:i:s'), 'updated_at' => date('Y-m-d H:i:s')],
		    ['content' => 'We cannot stress how happy we were with the gentlemen that stopped by our house. After reviewing our bill and finding us extra savings, he was able to review our cabin\'s bill on Buckeye Lake and get us some savings there too!', 'location' => 'Columbus, OH', 'testimonial_type' => 1, 'created_at' => date('Y-m-d H:i:s'), 'updated_at' => date('Y-m-d H:i:s')],
		    ['content' => 'The young man, Damian, who stopped by to help me was very impressive. He was extremely friendly, patient and vigilant at making sure that I was getting the best deal. As an 81-year-old retired woman on a fixed income, energy bills can be very stressful with how unpredictable they can be. Damian made sure to help get me as much as savings as he could and went over everything everytime I asked since I didn\'t really understand what it was at first.', 'location' => 'Naperville, IL', 'testimonial_type' => 1, 'created_at' => date('Y-m-d H:i:s'), 'updated_at' => date('Y-m-d H:i:s')],
		    ['content' => 'I have been approached many times regarding my energy utilities at mutliple office locations of my business. I have always been wary and turned down every offer. One weekend while relaxing at my cabin, one of your young ladies approached and at first I was reluctant to even give her the time to talk. However, she was friendly and I thought I would give her a listen. I was immediately impressed with her level of professionalism and knowledge on the industry, and eventually let her enroll my cabin on your plan. She asked about my businesses, but I told her I would hold off. Since then, I reached back out to her and we have enrolled our other two residences and all of my business locations. I estimate that she has saved me over $1,000 dollars annually! Thank you from a late believer.', 'location' => 'Michigan', 'testimonial_type' => 1, 'created_at' => date('Y-m-d H:i:s'), 'updated_at' => date('Y-m-d H:i:s')],
		    ['content' => 'I have been with CMP for 8 years. My previous best job was in a factory. I had tried sales, but couldn\'t sell $2,000 vacuums and feel good about myself. I said I would never do sales again, and then I ran into CMP and their management training program. It took me almost one year before I got my first office and I never looked book!', 'location' => 'Tony R', 'testimonial_type' => 2, 'created_at' => $date, 'updated_at' => $date],
		    ['content' => 'I messed around and never truly believed in the process. I would work for a while and just leave every time I heard about another company offering more money. Every time it got tough, I found it easy to just find a new company instead of overcoming the adversity. After leaving CMP, they were gracious enough to take me back when I realized what I was missing when I left. Since I got back, in less than six months I have received two promotions and this past month I won an all-expense paid trip to Las Vegas! Airfare, hotel and cash to spend while a guest and I went to enjoy the strip!', 'location' => 'James L', 'testimonial_type' => 2, 'created_at' => $date, 'updated_at' => $date],
		    ['content' => 'I have sold residential forever. This is the first company who really cares for its people!', 'location' => 'Greg H', 'testimonial_type' => 2, 'created_at' => $date, 'updated_at' => $date],
		    ['content' => 'When I was reported to General Manager I was given a new car! I cannot wait to find out what comes next with my career.', 'location' => 'Sarah B', 'testimonial_type' => 2, 'created_at' => $date, 'updated_at' => $date],
		    ['content' => 'I went to the service after high school and then graduated with a bachelor\'s degree in sales and I have never had the experience that I have gained with Choice Marketing Partners. The Manager Training Program is second to none and they honestly want to build leaders!', 'location' => 'James N', 'testimonial_type' => 2, 'created_at' => $date, 'updated_at' => $date],
		    ['content' => 'I have worked for several marketing companies before and they always talk about promotions and advancement but that never seems to materialize. At CMP, they really do strive to help you advance within a complete system that values integrity, honesty and a great work ethic.', 'location' => 'James G', 'testimonial_type' => 2, 'created_at' => $date, 'updated_at' => $date]
	    ]);
    }
}
