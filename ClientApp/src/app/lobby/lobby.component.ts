import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { Message, Room, User } from '../models';
import { HubBuilderService } from '../services/hub-builder.service';

@Component({
  selector: 'app-lobby',
  templateUrl: './lobby.component.html',
  styleUrls: ['./lobby.component.css']
})
export class LobbyComponent implements OnInit, OnDestroy {
  activeTab: 'rooms' | 'peeps' = 'peeps';

  selectedRoom: Room = null;
  rooms: Room[];
  szobak: string[];
  peeps: User[];

  newRoomName: string;
  newRoomIsPrivate: boolean = false;
  newRoomPasskey: string;

  lobbyMessages: Message[];
  lobbyLoading: boolean = false;

  chatMessage: string;
  connection: signalR.HubConnection;

  constructor(hubBuilder: HubBuilderService, private router: Router) {
    // felépítjük a SignalR kapcsolatot
    // bekötjük a szerverről érkező lobby üzenetek érkezését
    this.connection = hubBuilder.getConnection();
    // Beregisztráljuk a szervertől érkező üzenetek eseménykezelőjét. Típusosan is tudnánk kezelni egy
    // olyan objektum tulajdonságainak bejárásával, aminek tulajdonságai az eseménykezelők.

    //ezeket kell megvalósítanunk a kliensen, a szerver hívja őket
    this.connection.on("SetUsers", users => this.setUsers(users));
    this.connection.on("UserEntered", user => this.userEntered(user));
    this.connection.on("UserLeft", userId => this.userLeft(userId));
    this.connection.on("SetMessages", messages => this.setMessages(messages));
    this.connection.on("SetRooms", rooms => this.setRooms(rooms));
    this.connection.on("RecieveMessage", message => this.recieveMessage(message));
    this.connection.on("RoomCreated", room => this.roomCreated(room));
    this.connection.on("RoomAbandoned", roomName => this.recieveMessage(roomName));
    
    this.peeps = [];
    this.rooms = [];
    this.szobak = [];
    this.lobbyMessages = [];
    this.connection.start().then(() => {
      this.connection.invoke("EnterLobby");
    });
  }

  ngOnInit() { }

  ngOnDestroy() {
    // Amikor a komponens megsemmisül (pl. navigáció esetén), zárjuk a kapcsolatot. Ne felejtsük el az
    // eseménykezelőket leiratkoztatni, különben memory leakünk lesz!
    this.connection.off("SetUsers");
    this.connection.off("UserEntered");
    this.connection.off("UserLeft");
    this.connection.off("SetMessages");
    this.connection.off("SetRooms");
    this.connection.off("RecieveMessage");
    this.connection.off("RoomCreated");
    this.connection.off("RoomAbandoned");
    
    this.connection.stop(); 
    // A stop() függvény valójában aszinkron, egy Promise-szal tér vissza. A
    // kapcsolat lebontása időt vesz igénybe, de nem használjuk újra a connection objektumot, ezért
    // nem okoz gondot, ha néhány másodpercig még élni fog az az objektum.
  }

  recieveMessage(message: Message) {
    // beérkező üzenet kezelése
    this.lobbyMessages.splice(0, 0, message);
  }

  userEntered(user: User) {
    // a szerver azt jelezte, hogy az aktuális szobába csatlakozott egy user. Ezt el kell
    // tárolnunk a felhasználókat tároló tömbben.
    this.peeps.push(user);
  }

  userLeft(userId: string) {
    // a szerver azt jelezte, hogy a megadott ID-jú felhasználó elhagyta a szobát, így ki kell
    // vennünk a felhasználót a felhasználók tömbjéből ID alapján.
    delete this.peeps[userId];
  }

  setUsers(users: User[]) {
    // A szerver belépés után leküldi nekünk a teljes user listát:    
    console.log("SET USERS!" + users);
    this.peeps = users;
  }

  setMessages(messages: Message[]) {
    // A szerver belépés után leküldi nekünk a korábban érkezett üzeneteket:
    console.log("SET MESSAGES!" + messages);
    this.lobbyMessages = messages;
  }
  
  setRooms(rooms: Room[]): void {
    console.log("SET ROOMS!" + rooms);
    //this.szobak = rooms;
    this.rooms = rooms;
  }

  sendMessage() {
    // A szervernek az invoke függvény meghívásával tudunk küldeni üzenetet.
    this.connection.invoke("SendMessageToLobby", this.chatMessage);
    // A kérés szintén egy Promise, tehát feliratkoztathatnánk rá eseménykezelőt, ami akkor sül el, ha
    // a szerver jóváhagyta a kérést (vagy esetleg hibára futott). A szerver egyes metódusai Task
    // helyett Task<T>-vel is visszatérhetnek, ekkor a válasz eseménykezelőjében megkapjuk a válasz
    // objektumot is:
    // this.connection.invoke("SendMessageToLobby", this.chatMessage)
    // .then((t: T) => {
    // console.log(t);
    // })
    // .catch(console.error);
    this.chatMessage = "";
  }

  roomExists(){
    return this.rooms.some(obj => obj.name === this.newRoomName);
  } 

  createRoom() {
    // szoba létrehozása szerveren, majd navigáció a szoba útvonalára, szükség esetén megadni a passkey-t    
    // let room = new Room();
    // room.name = this.newRoomName;
    // room.creationDate = "";
    // room.requiresPasskey = this.newRoomIsPrivate;

    // console.log("New room:" + room.name);

    this.connection.invoke("AddRoom", {name: this.newRoomName, creationDate: "", requiresPasskey: this.newRoomIsPrivate}, this.newRoomPasskey)
      .catch(err => console.error("AddRoom error: " + err));

    this.newRoomName = "";
    this.newRoomPasskey = "";
    this.newRoomIsPrivate = false;
  }

  roomCreated(room: string) {
    // szobalista frissítése
    console.log("ROOM CREATED!" + room);
    var room2 : Room = 
    {
      name: room,
      creationDate: "",
      requiresPasskey: false 
    }
    this.rooms.push(room2);
    this.szobak.push(room);
  }

  roomAbandoned(roomName: string) {
    // szobalista frissítése
    this.selectedRoom = null;
    delete this.rooms[roomName];
  }

  enterRoom(room: Room) {
    // navigáció a szoba útvonlára, figyelve, hogy kell-e megadni passkey-t
    if(room.requiresPasskey){
      //
    }
    //this.router.navigate(["/room/" + this.newRoomName])
    this.selectedRoom = room;
  }
}
