import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;

public class Main {
    public static void main(String[] args) {
        Ticket concertTicket = new Ticket("Teatro Belas Artes", 30.0);
        Ticket theaterTicket = new Ticket("Filme Resident Evil Village", 50.0);

        TicketFactory ticketFactory = new TicketFactory();
        ticketFactory.addTicketPrototype("Teatro Belas Artes", concertTicket);
        ticketFactory.addTicketPrototype("Filme Resident Evil Village", theaterTicket);

        TicketService ticketService = new TicketService(ticketFactory);

        ExecutorService executor = Executors.newFixedThreadPool(10);

        for (int i = 0; i < 5; i++) {
            final String event = (i % 2 == 0) ? "Teatro Belas Artes" : "Filme Resident Evil Village";
            executor.submit(() -> ticketService.sellTicket(event));
        }

        executor.shutdown();  
        try {
           
            if (!executor.awaitTermination(5, TimeUnit.SECONDS)) {
                System.out.println("As Tarefas não foram carregadas completamente, Tente novamente.");
                executor.shutdownNow(); 
            }
        } catch (InterruptedException e) {
            executor.shutdownNow();
            Thread.currentThread().interrupt(); 
        }
    }
}
