/**
 * NODE MODULES
 */
const WebSocket = require("ws")
const uuid = require("node-uuid")
const wss = new WebSocket.Server({port: 8085}) //Referencias made in uja (xd)

/**
 * VARIABLES AUXILIARES
 */
var conexiones = {} //Diccionario [String (user id): Socket (client)]
var users = {} //Diccionario [String (user id): String (user nickname)] ¡Nicks repetidos yay!

wss.on("connection", (client) => {
    client.on("message", (e) => { //Al recibir un mensaje (e->evento)
        var data = JSON.parse(e) //Lo convierto a JSON
        switch(data.tipo){ //Según el tipo, hago algo.
            case "disconnect": //Si un usuario se desconecta cerramos su conexión y lo eliminamos de la lista de users online
                conexiones[data.userid].close()
                delete conexiones[data.userid]
                delete users[data.userid]
                Object.keys(conexiones).forEach((id) => { //Además, lo notificamos a los demás
                    conexiones[id].send(JSON.stringify({
                        tipo: "useroffline",
                        userid: data.userid
                    }))
                })
                console.log(`El usuario con id ${data.userid} se ha desconectado. (${Object.keys(conexiones).length})`)
                break;
            case "username": //Nuevo usuario. Generamos su uid y se lo notificamos al resto.
                client.username = data.contenido
                client.id = uuid.v4()
                users[client.id] = data.contenido
                console.log("Nuevo cliente, ID: " + client.id + ". Username: " + client.username);
                client.send(JSON.stringify({ //Le doy al nuevo user su id y la lista de users online
                    tipo: "getID",
                    userid: client.id,
                    listausers: users
                }))
                Object.keys(conexiones).forEach((id) => { //Notifico a los demás el nuevo miembro.
                    conexiones[id].send(JSON.stringify({
                        tipo: "useronline",
                        username: client.username,
                        userid: client.id
                    }))
                })
                conexiones[client.id] = client
                break;
            case "icecandidate": //Pasamos al usuario con id "send" el ice candidate.
                    if(conexiones[data.send]){
                        conexiones[data.send].send(JSON.stringify({
                            tipo: "icecandidate",
                            candidato: data.candidato
                        }))
                    }
                break;
            case "offer": //Pasamos la oferta al usuario con id "remote_uid"
                //Es un if un poco absurdo, pero por asegurar...
                if(conexiones[data.remote_uid]){
                    console.log("Enviando oferta de " + users[data.origin_uid] + "->" + users[data.remote_uid])
                    conexiones[data.remote_uid].send(JSON.stringify({
                        tipo: "offer",
                        origin_uid: data.origin_uid,
                        remote_uid: data.remote_uid,
                        sdp: data.sdp
                    }))
                }
                break;
            case "answer": //Similar a la oferta, pero ahora respondemos.
                if(conexiones[data.origin_uid]){
                    console.log("Enviando respuesta de " + users[data.origin_uid] + "<-" + users[data.remote_uid])
                    conexiones[data.origin_uid].send(JSON.stringify({
                        tipo: "answer",
                        origin_uid: data.origin_uid,
                        remote_uid: data.remote_uid,
                        sdp: data.sdp
                    }))
                }
                    break;
            default: //El server no entiende el tipo de mensaje y no puede hacer nada. F
                console.log("No se ha entendido el tipo de mensaje: " + data.tipo)
                break;
        }
    })
})