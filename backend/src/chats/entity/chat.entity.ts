import { randomUUID } from 'crypto';

export class Chat {

  private _id: string;
  private _userAID: string;
  private _userBID: string;
  
  
  constructor(userAID: string, userBID: string) {
    this._id = randomUUID();
    this._userAID = userAID;
    this._userBID = userBID;
  }

  //getters

  get id(): string {
    return this._id;
  }
  
  get userAID(): string {
    return this._userAID;
  }

  get userBID(): string {
    return this._userBID;
  }


  // setters

  set id(id: string) {
    this._id = id;
  }

  set userAID(userAID: string) {
    this._userAID = userAID;
  }

  set userBID(userBID: string) {
    this._userBID = userBID;
  }
}