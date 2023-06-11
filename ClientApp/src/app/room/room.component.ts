import { Component, Input, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Message } from '../models';
import { HubBuilderService } from '../services/hub-builder.service';

@Component({
  selector: 'app-room',
  templateUrl: './room.component.html',
  styleUrls: ['./room.component.css']
})
export class RoomComponent implements OnInit {  

  id: string;
  roomMessages: Message[];

  chatMessage: string;
  connection: signalR.HubConnection;
  
  constructor(hubBuilder: HubBuilderService, private route: ActivatedRoute) {
    
    this.connection = hubBuilder.getConnection();
    
    route.params.subscribe(p => {
      this.id = p["id"];
    });
  }

  ngOnInit() {
    var message : Message ={
      text: "Hello this is Room " + this.id,
      postedDate:  new Date().toString(),
      senderId: "bot",
      senderName: "Bot"
    }
    this.roomMessages.push(message);
  }

}
