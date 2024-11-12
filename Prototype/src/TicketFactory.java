import java.util.HashMap;
import java.util.Map;
import java.util.UUID;

public class TicketFactory {
    public Map<String, Ticket> ticketPrototype = new HashMap<>();

    public void addTicketPrototype(String eventName, Ticket ticket) {
        ticketPrototype.put(eventName, ticket);
    }

    public Ticket getTicket(String eventName) {
        Ticket prototype = ticketPrototype.get(eventName);
        if (prototype != null) {
            Ticket newTicket = prototype.clonePrototype();
            newTicket.setId(UUID.randomUUID().toString()); 
            return newTicket;
        }
        throw new IllegalArgumentException("Evento não Disponivel: " + eventName);
    }
}
