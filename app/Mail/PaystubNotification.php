<?php

namespace App\Mail;

use App\Paystub;
use App\Plugins\PDF;
use Carbon\Carbon;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Mail\Mailable;
use Illuminate\Queue\SerializesModels;

class PaystubNotification extends Mailable
{
    use Queueable, SerializesModels;

    public $paystub;
    public $pdfData;

	/**
	 * Create a new message instance.
	 *
	 * @param Paystub $paystub
	 * @param null $pdfOutput
	 */
    public function __construct(Paystub $paystub, $pdfOutput = null)
    {
        //
	    $this->paystub = $paystub;
	    $this->pdfData = $pdfOutput;
    }

    /**
     * Build the message.
     *
     * @return $this
     */
    public function build(): PaystubNotification
    {
    	$issueDate = Carbon::createFromFormat('Y-m-d', $this->paystub->issue_date)
	                       ->toFormattedDateString();

    	if ($this->pdfData != null)
	    {
	    	return $this->from('noreply@choice-marketing-partners.com')
			    ->subject('Choice Marketing Paystub Delivery ('. $issueDate .')')
			    ->view('emails.paystub')
			    ->attachData($this->pdfData, 'attachment.pdf');
	    }
	    else
	    {
		    return $this->from('noreply@choice-marketing-partners.com')
                ->subject('Choice Marketing Paystub Delivery ('. $issueDate .')')
                ->view('emails.paystub');
	    }
    }
}
