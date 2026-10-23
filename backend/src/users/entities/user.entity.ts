import { randomUUID } from 'crypto';

export class User {

  private _id: string;
  private _username: string;
  private _name: string;
  private _authKey: string;
  private _publicKey: string;
  private _encryptedPrivateKey: string;

  constructor(
    username: string,
    name: string,
    authKey: string,
    publicKey: string,
    encryptedPrivateKey: string,
  ) {
    this._id = randomUUID();
    this._username = username;
    this._name = name;
    this._authKey = authKey;
    this._publicKey = publicKey;
    this._encryptedPrivateKey = encryptedPrivateKey;
  }

  //getters

  get id(): string {
    return this._id;
  }
  
  get username(): string {
    return this._username;
  }
  
  get name(): string {
    return this._name;
}
  
  get authKey(): string {
    return this._authKey;
  }
  
  get publicKey(): string {
    return this._publicKey;
  }
  
  get encryptedPrivateKey(): string {
    return this._encryptedPrivateKey;
  }


  // setters

  set id(id: string) {
    this._id = id;
  }

  set username(username: string) {
    this._username = username;
  }

  set name(name: string) {
    this._name = name;
  }

  set authKey(authKey: string) {
    this._authKey = authKey;
  }

  set publicKey(publicKey: string) {
    this._publicKey = publicKey;
  }

  set encryptedPrivateKey(encryptedPrivateKey: string) {
    this._encryptedPrivateKey = encryptedPrivateKey;
  }

}