import asyncio
import json
import random
import math
import websockets

CLIENT_COUNTER = 0
ITEMS = [
    {"name": "Cigarrete", "description": "Restaura 1 vida."},
    {"name": "Handcuffs", "description": "Prende o adversário por 1 rodada."},
    {"name": "MagnifyingGlass", "description": "Enxerga a próxima munição."},
    {"name": "Saw", "description": "Causa o dobro de Dano."},
    {"name": "Beer", "description": "Retira a próxima munição."}
]
GAMES = []


async def handle_client(websocket, path):
    global CLIENT_COUNTER
    CLIENT_COUNTER += 1
    client_id = CLIENT_COUNTER
    await websocket.send(json.dumps(
        {"type":"CONNECTION",
        "client_id": client_id}))

    while True:
        try:
            message = await websocket.recv()
            print("Mensagem recebida do cliente:", message)
            data = json.loads(message)
            message_type = data['type']

            print("\nMENSAGEM DO CLIENTE:  ", data, "\n")

            if message_type == 'START_GAME':
                await handle_start_game(data, websocket)

            elif message_type == 'PLAYER_ACTION':
                await handle_player_action(data, websocket)

            else:
                print("Tipo de mensagem desconhecido.")

        except Exception as e:
            print(f"Cliente {client_id} desconectado: {e}")
            break


async def handle_start_game(data, websocket):
    global GAMES
    player_added = False
    player_name = data["player_name"]
    player_id = data["player_id"]
    maximum_lives = 5
    maximum_players_per_game = 2
    player_object = {"id": player_id, "name": player_name, "lives": maximum_lives, "items": [], "handcuffed": False}

    for game in GAMES:
        if len(game["players_sockets"]) < maximum_players_per_game:
            add_player_to_game(game, player_id, player_object, websocket)
            current_game = game
            player_added = True

    if not player_added:
        current_game = create_new_game(player_object, player_id, websocket)

    sockets_to_send = current_game["players_sockets"]
    game_id = current_game["game_id"]

    await send_game_settings_to_all(sockets_to_send, game_id, current_game["game_state"])


def add_player_to_game(game, player_id, player_object, websocket):
    game["game_state"]["players"][player_id] = player_object
    game["players_sockets"].append(websocket)
    game["game_state"]["player_turn"] = pick_first_player(game["game_state"]["players"])
    game["bullets"] = create_bullets()
    game["game_state"]["status"] = "STARTED"
    game["game_state"]["message"] = "O Jogo Começou!"
    game["game_state"]["round_warning"] = round_warning(game)
    give_players_itens(game)


def pick_first_player(players):
    player_ids = list(players.keys())
    starting_player_id = random.choice(player_ids)

    return starting_player_id


def create_new_game(player_object, player_id, websocket):
    INITIAL_GAME_STATE = {
        "players": {},
        "player_turn": None,
        "round": 1,
        "status": "WAITING_PLAYERS",
        "message": "",
        "round_warning": None,
        "last_action": None,
        "action_count": 0
    }

    game_id = len(GAMES) + 1

    game_state = INITIAL_GAME_STATE

    game_state["players"][player_id] = player_object

    game = {"game_id": game_id,
            "game_state": game_state,
            "bullets": None,
            "players_sockets": [websocket]
            }

    GAMES.append(game)
    return game


async def handle_player_action(data, websocket):
    game = get_game_by_id(data["game_id"])
    game["game_state"]["round_warning"] = None
    game_state = game["game_state"]
    players_sockets = game["players_sockets"]
    action_type = data["action"]["type"]

    if action_type == "SHOOT":
        current_bullet = game["bullets"]["chamber"].pop(0)
        handle_shooting_action(game, game_state, data, current_bullet)
        action = {
            "type": action_type,
            "target_player_id": data["action"]["target_player_id"],
            "bullet_charged": current_bullet
        }

    elif action_type == "USE_ITEM":
        if(data["action"]["item_type"] == "Beer" or data["action"]["item_type"] == "MagnifyingGlass"):
          bullet = await handle_item_action(game, game_state, data)
          action = {
            "type": action_type,
            "item_type": data["action"]["item_type"],
            "bullet_charged": bullet
          }
        else:
          await handle_item_action(game, game_state, data)
          action = data["action"]
    
    game_state["last_action"] = {
        "last_player": data["player_id"], 
        "action": action
    }

    game_state["action_count"] += 1

    await send_game_state_to_all(players_sockets, game_state)


async def handle_item_action(game, game_state, data):
    current_player_id = data["player_id"]
    current_player_name = game["game_state"]["players"][current_player_id]["name"]
    item_type = data["action"]["item_type"]

    if item_type == "Cigarrete":
        if game_state["players"][current_player_id]["lives"] < 5:
            game_state["players"][current_player_id]["lives"] += 1

    elif item_type == "Handcuffs":
        target_player_id = get_other_player_id(current_player_id, game_state)
        game_state["players"][target_player_id]["handcuffed"] = True

    elif item_type == "MagnifyingGlass":
        next_bullet = game["bullets"]["chamber"][0]
        handle_delete_item(game_state, data)
        return next_bullet

    elif item_type == "Saw":
        game["bullets"]["buffed"] = 1

    elif item_type == "Beer":
        bullet = game["bullets"]["chamber"].pop(0)
        handle_delete_item(game_state, data)
        if len(game["bullets"]["chamber"]) == 0:
            new_round(game)
        return bullet

    game["game_state"]["message"] = f"{current_player_name} usou {item_type}"
    handle_delete_item(game_state, data)


async def send_beer_response(bullet, clients):
    response_json = {
        "type": "BEER",
        "next_bullet": bullet
    }
    response = json.dumps(response_json)

    for c in clients:
        await c.send(response)


async def send_magnifying_glass_response(next_bullet, websocket):
    response_json = {
        "type": "MAGNIFYING_GLASS_RESPONSE",
        "next_bullet": next_bullet
    }
    response = json.dumps(response_json)

    await websocket.send(response)


def handle_delete_item(game_state, data):
    player_items = game_state["players"][data["player_id"]]["items"]
    for item in player_items:
        if item["name"] == data["action"]["item_type"]:
            player_items.remove(item)
            break


def handle_shooting_action(game, game_state, data, current_bullet_is_loaded):
    current_player_id = data["player_id"]
    target_player_id = data["action"]["target_player_id"]
    additional_damage = game["bullets"]["buffed"]

    if current_bullet_is_loaded:
        game_state["players"][target_player_id]["lives"] -= 1 + additional_damage
        game_state["message"] = loaded_bullet_message(current_player_id, target_player_id, game_state)
        if game_state["players"][target_player_id]["lives"] <= 0:
            game_state["players"][target_player_id]["lives"] = 0
            game_state["message"] = end_message(current_player_id, target_player_id, game_state)
            game_state["status"] = "ENDED"
        change_player_turn(current_player_id, game_state)
    else:
        if current_player_id != target_player_id:
            change_player_turn(current_player_id, game_state)
        game_state["message"] = discharged_bullet_message(current_player_id, target_player_id, game_state)

    if additional_damage != 0:
        game["bullets"]["buffed"] = 0

    if len(game["bullets"]["chamber"]) == 0:
        new_round(game)


def new_round(game):
        game["bullets"] = create_bullets()
        game["game_state"]["round"] += 1
        game["game_state"]["round_warning"] = round_warning(game)
        give_players_itens(game)

def give_players_itens(game):
    global ITEMS
    max_item_per_player = 2

    for player_id, player_data in game["game_state"]["players"].items():
        while len(player_data["items"]) < max_item_per_player:
            item_index = random.randint(0, len(ITEMS) - 1)
            item = ITEMS[item_index].copy()
            player_data["items"].append(item)


async def send_game_ended_to_all(clients, game_state):
    game_state_json = {
        "type": "GAME_ENDED",
        "game_state": game_state
    }
    response = json.dumps(game_state_json)

    for c in clients:
        await c.send(response)


def loaded_bullet_message(current_player_id, target_player_id, game_state):
    current_player_name = game_state["players"][current_player_id]["name"]

    if current_player_id == target_player_id:
        return current_player_name + " Atirou em si mesmo com uma munição carregada\n" + current_player_name + " Passou a vez."

    target_player_name = game_state["players"][target_player_id]["name"]
    return current_player_name + " Atirou em " + target_player_name + " com uma munição carregada\n" + current_player_name + " Passou a vez."


def discharged_bullet_message(current_player_id, target_player_id, game_state):
    current_player_name = game_state["players"][current_player_id]["name"]

    if current_player_id == target_player_id:
        return current_player_name + " tentou atirar em si mesmo porém a munição não estava carregada.\n" + current_player_name + " Jogará novamente."

    target_player_name = game_state["players"][target_player_id]["name"]
    return current_player_name + " tentou Atirar em " + target_player_name + " porém a munição não estava carregada.\n" + current_player_name + " Passou a vez."


def round_warning(game):
    round_number = game["game_state"]["round"]
    charged_bullets = game["bullets"]["charged"]
    discharged_bullets = game["bullets"]["discharged"]

    return {"round_number": round_number,
            "charged_bullets": charged_bullets,
            "discharged_bullets": discharged_bullets
            }


def end_message(current_player_id, target_player_id, game_state):
    current_player_name = game_state["players"][current_player_id]["name"]

    if current_player_id == target_player_id:
        winner_id = get_other_player_id(current_player_id, game_state)
        winner_player_name = game_state["players"][winner_id]["name"]
        return current_player_name + " Eliminou-se \nO vencedor é " + winner_player_name

    target_player_name = game_state["players"][target_player_id]["name"]
    return current_player_name + " Eliminou " + target_player_name + "\nO vencedor é " + current_player_name


def change_player_turn(current_player_id, game_state):
    target_player_id = get_other_player_id(current_player_id, game_state)
    if game_state["players"][target_player_id]["handcuffed"] is False:
        game_state["player_turn"] = get_other_player_id(current_player_id, game_state)
    else:
        game_state["players"][target_player_id]["handcuffed"] = False


def get_other_player_id(current_id, game_state):
    for player_id in game_state["players"].keys():
        if player_id != current_id:
            return player_id


async def send_game_state_to_all(clients, game_state):
    game_state_json = {
        "type": "GAME_STATE",
        "game_state": game_state
    }
    response = json.dumps(game_state_json)

    for c in clients:
        await c.send(response)


async def send_game_settings_to_all(clients, game_id, game_state):
    game_state_json = {
        "type": "GAME_SETTINGS",
        "game_id": game_id,
        "game_state": game_state,
    }
    response = json.dumps(game_state_json)

    for c in clients:
        await c.send(response)


def create_bullets():
    quantity_bullets = random.randint(3, 8)
    minimum_discharged = math.ceil(quantity_bullets / 2) - 1
    maximum_discharged = quantity_bullets - 1

    if quantity_bullets >= 6:
        maximum_discharged = quantity_bullets - 2

    quantity_discharged = random.randint(minimum_discharged, maximum_discharged)
    quantity_charged = quantity_bullets - quantity_discharged

    bullets = []

    for _ in range(quantity_bullets):
        bool = True

        if quantity_discharged != 0:
            bool = False
            quantity_discharged -= 1

        bullets.append(bool)

    random.shuffle(bullets)

    quantity_discharged_json = quantity_bullets - quantity_charged

    print(bullets)

    return {"chamber": bullets,
            "charged": quantity_charged,
            "discharged": quantity_discharged_json,
            "buffed": 0}


def get_game_by_id(game_id):
    global GAMES

    for game in GAMES:
        if game["game_id"] == int(game_id):
            return game


if __name__ == "__main__":
    start_server = websockets.serve(handle_client, "localhost", 9999)

    asyncio.get_event_loop().run_until_complete(start_server)
    asyncio.get_event_loop().run_forever()
