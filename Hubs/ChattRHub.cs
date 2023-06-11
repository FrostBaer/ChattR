using ChattR.Models;
using Microsoft.AspNetCore.SignalR;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace ChattR.Hubs
{
    public class ChattRHub : Hub<IChattRClient>
    {
        public const string LobbyRoomName = "ChattRLobby";
        public static HubRoom Lobby { get; } = new HubRoom
        {
            Name = LobbyRoomName
        };
        
        public class HubRoom
        {
            public string Name { get; set; }
            public string CreatorId { get; set; }
            public DateTimeOffset CreationDate { get; set; }
            public string Passkey { get; set; }
            public List<Message> Messages { get; } = new List<Message>();
            public List<User> Users { get; } = new List<User>();
        }

        //public Dictionary<string, HubRoom> Rooms { get; set; } = new Dictionary<string, HubRoom>();

        public List<HubRoom> Rooms { get; set; } = new List<HubRoom>()
        {
            new HubRoom
            { 
                Name = "Foxes room",
                Passkey = "",
                CreationDate = DateTimeOffset.Now,
                CreatorId = null
            }
        };

        public List<string> Szobak { get; set; } = new List<string>()
        {
            "carrot",
            "fox",
            "explorer"
        };

        // TODO: a szobakezelést érdemes a beépített Group mechanizmus segítségével kezelni, de az
        // kizárólag a klienseknek történő válaszok küldésére használható. A Group ID alapján
        // automatikusan "létrejön", ha egy felhasználó belép, és "megszűnik", ha az utolsó is kilép.
        // Ezért szükséges egy saját adatstruktúrában is eltárolnunk a szobákat, hogy a felhasználók
        // adatait és a korábbi üzeneteket meg tudjuk jegyezni. A ChattRHub nem singleton, minden
        // kéréshez egy ChattRHub objektum példányosodik. A legegyszerűbb megoldás egy statikus
        // objektumban tárolni itt az adatokat, de ez éles környezetben nem lenne optimális, helyette
        // egy singleton service-ben kellene az adatokat kezelnünk. A laboron a statikus megoldás
        // teljesen megfelel, de legyünk tisztában a "static smell" jelenséggel; állapotot megosztani
        // explicit érdemes, tehát függőséginjektálással, nem "láthatatlan" statikus függőségekkel.
        public async Task EnterLobby()
        {
            var user = new User { Id = Context.UserIdentifier, Username = Context.User.Identity.Name };
            Lobby.Users.Add(user);
            // Megvizsgálhatjuk a Client objekumot: ezen keresztül érjük el a hívó klienst (Caller),
            // adott klienseket tudunk megszólítani pl. ConnectionId vagy UserIdentifier alapján, vagy
            // használhatjuk a beépített csoport (Group) mechanizmust felhasználói csoportok kezelésére.
            await Clients.Group(LobbyRoomName)
            // A Client típusunk a fent megadott típusparaméter, ezeket a függvényeket tudjuk
            // meghívni a kliense(ke)n.
            .UserEntered(user);

            await Groups.AddToGroupAsync(Context.ConnectionId, LobbyRoomName);
            await Clients.Caller.SetUsers(Lobby.Users);
            await Clients.Caller.SetMessages(Lobby.Messages);

            List<Room> clientRooms = new List<Room>();            
            foreach (var r in Rooms)
            {
                Room room = new Room()
                {
                    Name = r.Name,
                    CreationDate = r.CreationDate,
                    RequiresPasskey = r.Passkey != ""
                };

                clientRooms.Add(room);
            }
            //await Clients.Caller.SetRooms(Szobak);
            await Clients.Caller.SetRooms(clientRooms);
        }

        public override Task OnDisconnectedAsync(Exception exception)
        {
            var user = Lobby.Users.FirstOrDefault(u => u.Id == Context.UserIdentifier);
            if (user != null)
            {
                Lobby.Users.Remove(user);
                foreach (var room in Rooms)
                {
                   // room.Value.Users.Remove(user);
                   // Clients.Group(room.Value.Name).UserLeft(Context.UserIdentifier);
                }
            }                
            // TODO: később a saját szobakezelés kapcsán is kezelni kell a kilépő klienseket
            Clients.Group(LobbyRoomName).UserLeft(Context.UserIdentifier);
            return base.OnDisconnectedAsync(exception);
        }

        // az egyik kliens hívja meg
        public async Task SendMessageToLobby(string message)
        {
            var messageInstance = new Message
            {
                SenderId = Context.UserIdentifier,
                SenderName = Context.User.Identity.Name,
                Text = message,
                PostedDate = DateTimeOffset.Now
            };
            Lobby.Messages.Add(messageInstance);

            // továbbítjuk a többi kliensnek a megváltozott információt
            await Clients.Group(LobbyRoomName).RecieveMessage(messageInstance);
        }
        
        public async Task AddRoom(Object room, string pass)
        {
            Room r = new Room();
            r.Name = room();
            //var hubRoom = new HubRoom
            //{
            //    Name = room.Name,
            //    Passkey = "pass",
            //    CreatorId = /*Context.UserIdentifier*/null,                
            //    CreationDate = DateTimeOffset.Now
            //};
            ////Rooms.Add(name, hubRoom);
            //Rooms.Add(hubRoom);
            //Szobak.Add(hubRoom.Name);

            // továbbítjuk az új szobalistát a többi kliensnek
            //await Clients.Caller.RoomCreated(hubRoom.Name);
            await Clients.Caller.RoomCreated(r.Name);
        }

        public async Task RemoveRoom(string roomName)
        {
            if (roomName != null)
               // Rooms.Remove(roomName);
            await Clients.Group(LobbyRoomName).RoomAbandoned(roomName);
        }
    }
}