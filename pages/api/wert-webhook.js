const handle = async (req, res) => {


    if (req.method === "POST") {

        if (req.body?.type === "order_complete") {

            console.log(req.body)

            const ticketId = req.body?.click_id;
            const paymentTxHash = req.body?.order.transaction_id;
            const retries = 0;
            const status = "paid";

            // const Ticket = connection.model('Ticket', TicketSchema);

            const timestamp = Date.now();
            const update = {paymentTxHash, timestamp, retries, status}

            try {
                // const doc = await Ticket.findByIdAndUpdate(ticketId, update)
                console.log(`ticketId: ${ticketId} - paid`)
            } catch (err) {
                console.log(err)
            }

        } else {

            console.log(req.body)

        }

        res.status(200).json({});


    }



};

export default handle;
