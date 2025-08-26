from flask import Flask, jsonify,request
from decimal import Decimal

from flask_cors import CORS
import psycopg2
import psycopg2.extras
import random
import os

app = Flask(__name__)
CORS(app)  # Active CORS pour toutes les routes



# Connexion à ta base de données
def get_db_connection_pg_admin():
    conn = psycopg2.connect(
        host="localhost",
        database="PokemonTCG",
        user="postgres",
        password="4864",
        port="5432"
    )
    return conn

def get_db_connection():
    conn = psycopg2.connect(
        host="ep-quiet-glitter-a2shr253.eu-central-1.aws.neon.tech",
        database="PokemonTCG",
        user="PokemonTCG_owner",
        password="m6dJwoH8KAMU",
        port="5432"
    )
    return conn

@app.route('/random_cards', methods=['GET'])
def random_cards():
    conn = get_db_connection()
    print(conn)
    cursor = conn.cursor()
    
    cursor.execute("""
        SELECT pc.id, pc.name, pc.image_url_large, pc.artist, ps.name AS set_name, ps.series
        FROM public.pokemon_card pc
        JOIN public.pokemon_sets ps ON pc.set_id = ps.id
        ORDER BY RANDOM()
        LIMIT 2;
    """)
    
    cards = cursor.fetchall()
    cursor.close()
    conn.close()

    return jsonify(cards)


@app.route('/save_choice', methods=['POST'])
def save_choice():
    data = request.json
    card1_id = data.get('card1_id')
    card2_id = data.get('card2_id')
    fav_card_id = data.get('fav_card_id')

    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.execute("""
        INSERT INTO public.choice (card1_id, card2_id, fav_card_id)
        VALUES (%s, %s, %s)
    """, (card1_id, card2_id, fav_card_id))

    conn.commit()
    cursor.close()
    conn.close()

    return jsonify({"message": "Choix enregistré avec succès"}), 201


@app.route('/top_100_cards', methods=['GET'])
def get_top_100_cards():
    conn = get_db_connection()
    cursor = conn.cursor()

    query = """
        SELECT 
            pc.id, 
            pc.name, 
            pc.artist, 
            pc.image_url_large, 
            COUNT(c.fav_card_id) AS wins, 
            (SELECT COUNT(*) FROM public.choice WHERE card1_id = pc.id OR card2_id = pc.id) AS total_duels,
            CASE 
                WHEN (SELECT COUNT(*) FROM public.choice WHERE card1_id = pc.id OR card2_id = pc.id) = 0 THEN 0
                ELSE ROUND(CAST(COUNT(c.fav_card_id) AS decimal) / (SELECT COUNT(*) FROM public.choice WHERE card1_id = pc.id OR card2_id = pc.id) * 100, 2)
            END AS win_rate
        FROM public.pokemon_card pc
        LEFT JOIN public.choice c ON pc.id = c.fav_card_id
        GROUP BY pc.id
        HAVING (SELECT COUNT(*) FROM public.choice WHERE card1_id = pc.id OR card2_id = pc.id) > 0
        ORDER BY win_rate DESC
        LIMIT 100;
    """

    cursor.execute(query)
    cards = cursor.fetchall()
    cursor.close()
    conn.close()

    return jsonify(cards)





@app.route('/top_illustrators', methods=['GET'])
def get_top_illustrators():
    conn = get_db_connection()
    cursor = conn.cursor()

    query = """
        SELECT pc.artist, COUNT(c.fav_card_id) AS total_wins, 
        COUNT(DISTINCT pc.id) AS total_cards,
        ROUND(CAST(COUNT(c.fav_card_id) AS decimal) / COUNT(DISTINCT pc.id) * 100, 2) AS win_rate
        FROM public.pokemon_card pc
        LEFT JOIN public.choice c ON pc.id = c.fav_card_id
        WHERE pc.artist IS NOT NULL
        GROUP BY pc.artist
        ORDER BY win_rate DESC
        LIMIT 10;
    """

    cursor.execute(query)
    illustrators = cursor.fetchall()
    cursor.close()
    conn.close()

    return jsonify(illustrators)


@app.route('/top_sets', methods=['GET'])
def get_top_sets():
    conn = get_db_connection()
    cursor = conn.cursor()

    query = """
        SELECT ps.name, COUNT(c.fav_card_id) AS total_wins, 
        COUNT(DISTINCT pc.id) AS total_cards,
        ROUND(CAST(COUNT(c.fav_card_id) AS decimal) / COUNT(DISTINCT pc.id) * 100, 2) AS win_rate
        FROM public.pokemon_sets ps
        JOIN public.pokemon_card pc ON pc.set_id = ps.id
        LEFT JOIN public.choice c ON pc.id = c.fav_card_id
        GROUP BY ps.name
        ORDER BY win_rate DESC
        LIMIT 10;
    """

    cursor.execute(query)
    sets = cursor.fetchall()
    cursor.close()
    conn.close()

    return jsonify(sets)


@app.route('/top_years', methods=['GET'])
def get_top_years():
    conn = get_db_connection()
    cursor = conn.cursor()

    # Requête pour obtenir le taux de victoires par année, classé chronologiquement
    query = """
        SELECT EXTRACT(YEAR FROM ps.release_date) AS year, 
               COUNT(c.fav_card_id) AS total_wins, 
               COUNT(DISTINCT pc.id) AS total_cards,
               ROUND(CAST(COUNT(c.fav_card_id) AS decimal) / COUNT(DISTINCT pc.id) * 100, 2) AS win_rate
        FROM public.pokemon_sets ps
        JOIN public.pokemon_card pc ON pc.set_id = ps.id
        LEFT JOIN public.choice c ON pc.id = c.fav_card_id
        GROUP BY year
        ORDER BY year ASC;  -- Classement chronologique
    """

    cursor.execute(query)
    years = cursor.fetchall()
    cursor.close()
    conn.close()

    return jsonify(years)



@app.route('/win_rate_by_type', methods=['GET'])
def get_top_types():
    conn = get_db_connection()
    cursor = conn.cursor()

    query = """
        SELECT pc.types, COUNT(c.fav_card_id) AS total_wins, 
        COUNT(DISTINCT pc.id) AS total_cards,
        ROUND(CAST(COUNT(c.fav_card_id) AS decimal) / COUNT(DISTINCT pc.id) * 100, 2) AS win_rate
        FROM public.pokemon_card pc
        LEFT JOIN public.choice c ON pc.id = c.fav_card_id
        WHERE pc.types IS NOT NULL
        GROUP BY pc.types
        ORDER BY win_rate DESC
        
    """

    cursor.execute(query)
    illustrators = cursor.fetchall()
    cursor.close()
    conn.close()

    return jsonify(illustrators)

@app.route('/search_pokemon_card', methods=['GET'])
def search_pokemon_card():
    conn = get_db_connection()
    cursor = conn.cursor()

    name_query = request.args.get('name')
    page = request.args.get('page', 1, type=int)  # Get page, default is 1
    limit = 20  # Number of items per page
    offset = (page - 1) * limit  # Calculate offset

    query = """
    SELECT pc.id, pc.name, ps.name AS set_name, pc.image_url_large 
    FROM pokemon_card pc
    JOIN pokemon_sets ps ON pc.set_id = ps.id
    WHERE pc.name ILIKE %s
    LIMIT %s OFFSET %s;
    """
    cursor.execute(query, (f'%{name_query}%', limit, offset))
    cards = cursor.fetchall()

    # Count total results for pagination
    count_query = """
    SELECT COUNT(*)
    FROM pokemon_card pc
    WHERE pc.name ILIKE %s;
    """
    cursor.execute(count_query, (f'%{name_query}%',))
    total_results = cursor.fetchone()[0]

    cursor.close()
    conn.close()

    return jsonify({
        'cards': cards,
        'total_results': total_results,
        'total_pages': (total_results + limit - 1) // limit,  # Calculate total pages
        'current_page': page
    })


@app.route('/card_info', methods=['GET'])
def card_info():
    conn = get_db_connection()
    cursor = conn.cursor()
    card_id = request.args.get('id')
    query = """
    SELECT pc.name, ps.name AS set_name, pc.artist, pc.types, pc.rarity, pc.image_url_large,
           (SELECT ROUND(CAST(COUNT(c.fav_card_id) AS decimal) / COUNT(DISTINCT all_cards.id) * 100, 2)
            FROM pokemon_card all_cards
            LEFT JOIN choice c ON all_cards.id = c.fav_card_id
            WHERE all_cards.id = pc.id) AS win_rate,
           (SELECT RANK() OVER (ORDER BY COUNT(c.fav_card_id) DESC)
            FROM pokemon_card all_cards
            LEFT JOIN choice c ON all_cards.id = c.fav_card_id
            WHERE all_cards.id = pc.id) AS rank
    FROM pokemon_card pc
    JOIN pokemon_sets ps ON pc.set_id = ps.id
    WHERE pc.id = %s;
    """
    cursor.execute(query, (card_id,))
    card = cursor.fetchall()
    cursor.close()
    conn.close()
    print(card)
    return jsonify(card[0])



@app.route('/choice_stats', methods=['POST'])
def choice_stats():
    data = request.json
    card1_id = data['card1_id']
    card2_id = data['card2_id']

    # Connexion à la base de données
    conn = get_db_connection()
    cursor = conn.cursor()

    # Requête pour obtenir le nombre total de choix pour ces deux cartes
    total_choices_query = """
    SELECT COUNT(*) FROM choice 
    WHERE card1_id = %s OR card2_id = %s
    """
    cursor.execute(total_choices_query, (card1_id, card2_id))
    total_choices = cursor.fetchone()[0]

    if total_choices == 0:
        return jsonify({
            'card1_percentage': 0,
            'card2_percentage': 0
        })

    # Requête pour obtenir combien de fois chaque carte a été choisie
    card1_wins_query = """
    SELECT COUNT(*) FROM choice 
    WHERE fav_card_id = %s
    """
    cursor.execute(card1_wins_query, (card1_id,))
    card1_wins = cursor.fetchone()[0]

    card2_wins_query = """
    SELECT COUNT(*) FROM choice 
    WHERE fav_card_id = %s
    """
    cursor.execute(card2_wins_query, (card2_id,))
    card2_wins = cursor.fetchone()[0]

    # Calcul des pourcentages
    card1_percentage = (card1_wins / total_choices) * 100
    card2_percentage = (card2_wins / total_choices) * 100

    cursor.close()
    conn.close()

    return jsonify({
        'card1_percentage': card1_percentage,
        'card2_percentage': card2_percentage
    })


@app.route('/export_choices', methods=['GET'])
def export_choices():
    conn = get_db_connection()
    cursor = conn.cursor()
    
    cursor.execute("SELECT * FROM public.choice;")
    choices = cursor.fetchall()
    cursor.close()
    conn.close()

    # Création du fichier .txt avec les INSERT
    file_path = os.path.join(os.getcwd(), 'choice_insert.sql')
    with open(file_path, 'w') as f:
        for choice in choices:
            choice_id, card1_id, card2_id, fav_card_id = choice
            insert_query = f"INSERT INTO choice (card1_id, card2_id, fav_card_id) VALUES ('{card1_id}', '{card2_id}', '{fav_card_id}');\n"
            f.write(insert_query)

    return jsonify({'message': 'Data exported successfully', 'file': file_path})


@app.route('/search_artists', methods=['GET'])
def search_artists():
    conn = get_db_connection()
    cursor = conn.cursor()

    name_query = request.args.get('name')

    query = """
    SELECT name
    FROM Artist
    WHERE name ILIKE %s
    LIMIT 10;
    """
    cursor.execute(query, (f'%{name_query}%',))
    artists = cursor.fetchall()

    cursor.close()
    conn.close()

    return jsonify([{"name": artist[0]} for artist in artists])


@app.route('/artist_info', methods=['GET'])
def artist_info():
    print("pipi")
    conn = get_db_connection()
    cursor = conn.cursor()

    artist_name = request.args.get('name')

    query = """
    SELECT a.name, a.number_of_card_produced,
           (COUNT(c.fav_card_id)::FLOAT / NULLIF((COUNT(c.card1_id) + COUNT(c.card2_id)), 0)::FLOAT) * 100 AS win_rate
    FROM Artist a
    JOIN pokemon_card pc ON a.name = pc.artist
    LEFT JOIN choice c ON pc.id = c.fav_card_id OR pc.id = c.card1_id OR pc.id = c.card2_id
    WHERE pc.artist = %s
    GROUP BY a.name, a.number_of_card_produced;
    """
    cursor.execute(query, (artist_name,))
    artist = cursor.fetchone()

    cursor.close()
    conn.close()
    print(artist)
    if artist:
        return jsonify({
            "name": artist[0],
            "number_of_card_produced": artist[1],
            "win_rate": artist[2]
        })
    else:
        return jsonify({"error": "Artiste non trouvé"}), 404


@app.route('/artist_cards', methods=['GET'])
def artist_cards():
    print("caca")
    conn = get_db_connection()
    cursor = conn.cursor()

    artist_name = request.args.get('name')
    page = request.args.get('page', 1, type=int)
    limit = 20  # Limite de cartes par page
    offset = (page - 1) * limit

    query = """
    SELECT pc.name, ps.name AS set_name, pc.image_url_large
    FROM pokemon_card pc
    JOIN pokemon_sets ps ON pc.set_id = ps.id
    WHERE pc.artist = %s
    LIMIT %s OFFSET %s;
    """
    cursor.execute(query, (artist_name, limit, offset))
    cards = cursor.fetchall()

    # Compter le nombre total de cartes pour la pagination
    count_query = """
    SELECT COUNT(*)
    FROM pokemon_card pc
    WHERE pc.artist = %s;
    """
    cursor.execute(count_query, (artist_name,))
    total_cards = cursor.fetchone()[0]

    cursor.close()
    conn.close()

    return jsonify({
        'cards': cards,
        'total_cards': total_cards,
        'total_pages': (total_cards + limit - 1) // limit,  # Calcul du nombre de pages
        'current_page': page
    })



def expected_score(rA, rB):
    return 1.0 / (1.0 + 10 ** ((rB - rA) / 400.0))

def k_factor(rating, games_played):
    # K adaptatif : plus élevé pour cartes “nouvelles”
    if rating >= 2400:
        return 16
    return 32 if games_played < 30 else 24

def to_float(x):
    if isinstance(x, Decimal):
        return float(x)
    return x


# GET /api/pair : renvoie 2 cartes, équilibrées par ELO
@app.route('/api/pair', methods=['GET'])
def api_pair():
    conn = get_db_connection()
    cur = conn.cursor(cursor_factory=psycopg2.extras.DictCursor)

    # 1) tirer carte A aléatoire
    cur.execute("""
        SELECT pc.id, pc.name, pc.image_url_large AS image, pc.artist,
               ps.name AS set_name, ps.series,
               COALESCE(pc.elo, 1000) AS elo,
               COALESCE(pc.games_played, 0) AS games_played,
               COALESCE(pc.wins, 0) AS wins,
               COALESCE(pc.losses, 0) AS losses
        FROM public.pokemon_card pc
        JOIN public.pokemon_sets ps ON pc.set_id = ps.id
        ORDER BY random() LIMIT 1;
    """)
    a = cur.fetchone()

    # 2) carte B proche en ELO (±200), sinon fallback aléatoire
    cur.execute("""
        SELECT pc.id, pc.name, pc.image_url_large AS image, pc.artist,
               ps.name AS set_name, ps.series,
               COALESCE(pc.elo, 1000) AS elo,
               COALESCE(pc.games_played, 0) AS games_played,
               COALESCE(pc.wins, 0) AS wins,
               COALESCE(pc.losses, 0) AS losses
        FROM public.pokemon_card pc
        JOIN public.pokemon_sets ps ON pc.set_id = ps.id
        WHERE pc.id <> %s
          AND COALESCE(pc.elo, 1000) BETWEEN %s - 200 AND %s + 200
        ORDER BY ABS(COALESCE(pc.elo, 1000) - %s), random()
        LIMIT 1;
    """, (a['id'], a['elo'], a['elo'], a['elo']))
    b = cur.fetchone()

    if not b:
        # fallback si rien dans la fenêtre
        cur.execute("""
            SELECT pc.id, pc.name, pc.image_url_large AS image, pc.artist,
                   ps.name AS set_name, ps.series,
                   COALESCE(pc.elo, 1000) AS elo,
                   COALESCE(pc.games_played, 0) AS games_played,
                   COALESCE(pc.wins, 0) AS wins,
                   COALESCE(pc.losses, 0) AS losses
            FROM public.pokemon_card pc
            JOIN public.pokemon_sets ps ON pc.set_id = ps.id
            WHERE pc.id <> %s
            ORDER BY random() LIMIT 1;
        """, (a['id'],))
        b = cur.fetchone()

    cur.close()
    conn.close()

    def clean(rec):
        return {
            "id": rec["id"],
            "name": rec["name"],
            "image": rec["image"],
            "artist": rec["artist"],
            "set_name": rec["set_name"],
            "series": rec["series"],
            "elo": to_float(rec["elo"]),
            "games_played": rec["games_played"],
            "wins": rec["wins"],
            "losses": rec["losses"],
        }

    return jsonify({"a": clean(a), "b": clean(b)})


# POST /api/duel : met à jour ELO des deux cartes
@app.route('/api/duel', methods=['POST'])
def api_duel():
    data = request.get_json(force=True)
    winner_id = data.get('winnerId')
    loser_id = data.get('loserId')

    if not winner_id or not loser_id or winner_id == loser_id:
        return jsonify({"error": "Invalid winner/loser ids"}), 400

    conn = get_db_connection()
    conn.autocommit = False
    cur = conn.cursor(cursor_factory=psycopg2.extras.DictCursor)

    try:
        # Verrouiller les 2 enregistrements
        cur.execute("""
            SELECT id, COALESCE(elo,1000) AS elo, COALESCE(games_played,0) AS games_played,
                   COALESCE(wins,0) AS wins, COALESCE(losses,0) AS losses
            FROM public.pokemon_card
            WHERE id IN (%s, %s)
            FOR UPDATE;
        """, (winner_id, loser_id))
        rows = cur.fetchall()
        if len(rows) != 2:
            raise Exception("Cards not found")

        cw = next(r for r in rows if r['id'] == winner_id)
        cl = next(r for r in rows if r['id'] == loser_id)

        Ew = expected_score(float(cw['elo']), float(cl['elo']))
        El = expected_score(float(cl['elo']), float(cw['elo']))
        Kw = k_factor(float(cw['elo']), int(cw['games_played']))
        Kl = k_factor(float(cl['elo']), int(cl['games_played']))

        dw = Kw * (1 - Ew)   # delta gagnant
        dl = Kl * (0 - El)   # delta perdant (négatif)

        # Update winner
        cur.execute("""
            UPDATE public.pokemon_card
            SET elo = COALESCE(elo,1000) + %s,
                wins = COALESCE(wins,0) + 1,
                games_played = COALESCE(games_played,0) + 1
            WHERE id = %s
            RETURNING id, name, image_url_large AS image,
                      (SELECT name FROM public.pokemon_sets s WHERE s.id = pokemon_card.set_id) AS set_name,
                      (SELECT series FROM public.pokemon_sets s WHERE s.id = pokemon_card.set_id) AS series,
                      artist, elo, games_played, wins, losses;
        """, (dw, winner_id))
        a = cur.fetchone()

        # Update loser
        cur.execute("""
            UPDATE public.pokemon_card
            SET elo = COALESCE(elo,1000) + %s,
                losses = COALESCE(losses,0) + 1,
                games_played = COALESCE(games_played,0) + 1
            WHERE id = %s
            RETURNING id, name, image_url_large AS image,
                      (SELECT name FROM public.pokemon_sets s WHERE s.id = pokemon_card.set_id) AS set_name,
                      (SELECT series FROM public.pokemon_sets s WHERE s.id = pokemon_card.set_id) AS series,
                      artist, elo, games_played, wins, losses;
        """, (dl, loser_id))
        b = cur.fetchone()

        conn.commit()

        def clean(rec):
            return {
                "id": rec["id"],
                "name": rec["name"],
                "image": rec["image"],
                "artist": rec["artist"],
                "set_name": rec["set_name"],
                "series": rec["series"],
                "elo": to_float(rec["elo"]),
                "games_played": rec["games_played"],
                "wins": rec["wins"],
                "losses": rec["losses"],
            }

        return jsonify({
            "a": clean(a),
            "b": clean(b),
            "delta": { "winner": dw, "loser": dl }
        })

    except Exception as e:
        conn.rollback()
        return jsonify({"error": str(e)}), 500
    finally:
        cur.close()
        conn.close()

# GET /api/leaderboard : top global par ELO
@app.route('/api/leaderboard', methods=['GET'])
def api_leaderboard():
    limit = int(request.args.get('limit', 25))
    offset = int(request.args.get('offset', 0))
    conn = get_db_connection()
    cur = conn.cursor(cursor_factory=psycopg2.extras.DictCursor)
    cur.execute("""
        SELECT pc.id, pc.name, pc.image_url_large AS image, pc.artist,
               ps.name AS set_name, ps.series,
               COALESCE(pc.elo, 1000) AS elo,
               COALESCE(pc.games_played, 0) AS games_played,
               COALESCE(pc.wins, 0) AS wins,
               COALESCE(pc.losses, 0) AS losses
        FROM public.pokemon_card pc
        JOIN public.pokemon_sets ps ON pc.set_id = ps.id
        ORDER BY COALESCE(pc.elo,1000) DESC
        LIMIT %s OFFSET %s;
    """, (limit, offset))
    items = cur.fetchall()

    cur.execute("SELECT COUNT(*) FROM public.pokemon_card;")
    total = cur.fetchone()[0]
    cur.close()
    conn.close()

    def clean(rec):
        return {
            "id": rec["id"],
            "name": rec["name"],
            "image": rec["image"],
            "artist": rec["artist"],
            "set_name": rec["set_name"],
            "series": rec["series"],
            "elo": to_float(rec["elo"]),
            "games_played": rec["games_played"],
            "wins": rec["wins"],
            "losses": rec["losses"],
        }

    return jsonify({
        "items": [clean(r) for r in items],
        "total": total
    })

# GET /api/cards/<id> : fiche d’une carte
@app.route('/api/cards/<card_id>', methods=['GET'])
def api_card_info(card_id):
    conn = get_db_connection()
    cur = conn.cursor(cursor_factory=psycopg2.extras.DictCursor)
    cur.execute("""
        SELECT pc.id, pc.name, pc.image_url_large AS image, pc.artist,
               ps.name AS set_name, ps.series,
               COALESCE(pc.elo, 1000) AS elo,
               COALESCE(pc.games_played, 0) AS games_played,
               COALESCE(pc.wins, 0) AS wins,
               COALESCE(pc.losses, 0) AS losses
        FROM public.pokemon_card pc
        JOIN public.pokemon_sets ps ON pc.set_id = ps.id
        WHERE pc.id = %s;
    """, (card_id,))
    row = cur.fetchone()
    cur.close()
    conn.close()
    if not row:
        return jsonify({"error": "Card not found"}), 404

    res = {
        "id": row["id"],
        "name": row["name"],
        "image": row["image"],
        "artist": row["artist"],
        "set_name": row["set_name"],
        "series": row["series"],
        "elo": to_float(row["elo"]),
        "games_played": row["games_played"],
        "wins": row["wins"],
        "losses": row["losses"],
        # Optionnel: l'UI affiche un mini sparkline si "elo_history" existe
        # "elo_history": [...]
    }
    return jsonify(res)


# GET /api/search?query=...
@app.route('/api/search', methods=['GET'])
def api_search():
    q = (request.args.get('query') or "").strip()
    if not q:
        return jsonify({"items": []})

    conn = get_db_connection()
    cur = conn.cursor(cursor_factory=psycopg2.extras.DictCursor)
    cur.execute("""
        SELECT pc.id, pc.name, pc.image_url_large AS image, pc.artist,
               ps.name AS set_name, ps.series,
               COALESCE(pc.elo, 1000) AS elo,
               COALESCE(pc.games_played, 0) AS games_played,
               COALESCE(pc.wins, 0) AS wins,
               COALESCE(pc.losses, 0) AS losses
        FROM public.pokemon_card pc
        JOIN public.pokemon_sets ps ON pc.set_id = ps.id
        WHERE pc.name ILIKE %s
           OR ps.name ILIKE %s
           OR pc.artist ILIKE %s
        ORDER BY COALESCE(pc.elo,1000) DESC
        LIMIT 50;
    """, (f"%{q}%", f"%{q}%", f"%{q}%"))
    items = cur.fetchall()
    cur.close()
    conn.close()

    def clean(rec):
        return {
            "id": rec["id"],
            "name": rec["name"],
            "image": rec["image"],
            "artist": rec["artist"],
            "set_name": rec["set_name"],
            "series": rec["series"],
            "elo": to_float(rec["elo"]),
            "games_played": rec["games_played"],
            "wins": rec["wins"],
            "losses": rec["losses"],
        }

    return jsonify({ "items": [clean(r) for r in items] })
if __name__ == '__main__':
    app.run(debug=True)
