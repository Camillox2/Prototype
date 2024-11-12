public class TicketService {
    public  TicketFactory ticketFactory;

    public TicketService(TicketFactory ticketFactory) {
        this.ticketFactory = ticketFactory;
    }

    public void sellTicket(String eventName) {
        Ticket ticket = ticketFactory.getTicket(eventName);
        System.out.println("Ingresso vendido! ID: " + ticket.getId() + ", Evento: " + ticket.getEventName() + ", Preço: " + ticket.getPrice());
    }
}
