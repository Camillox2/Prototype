import java.util.UUID;

public class Ticket implements Prototype {
    private String id;
    private String eventName;
    private double price;

    public Ticket(String eventName, double price) {
        this.id = UUID.randomUUID().toString();
        this.eventName = eventName;
        this.price = price;
    }

    public Ticket(Ticket target) {
        if (target != null) {
            this.id = target.id;
            this.eventName = target.eventName;
            this.price = target.price;
        }
    }

    @Override
    public Ticket clonePrototype() {
        return new Ticket(this);
    }

   
    public String getId() { return id; }
    public String getEventName() { return eventName; }
    public double getPrice() { return price; }
    public void setId(String id) { this.id = id; }
}
