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



# ─────────────────────────────────────────────────────────────
# Analytics endpoints (dicts prêts pour les graphes)
# ─────────────────────────────────────────────────────────────

def _rows_to_dict(rows, key_field, avg_field="avg_elo", count_field="count"):
    out = {}
    for r in rows:
        key = r[key_field] if r[key_field] is not None else "Unknown"
        out[str(key)] = {
            "avgElo": float(r[avg_field]) if r[avg_field] is not None else 0.0,
            "count": int(r[count_field]) if r[count_field] is not None else 0,
        }
    return out

@app.route('/api/stats/sets', methods=['GET'])
def stats_sets():
    conn = get_db_connection()
    cur = conn.cursor(cursor_factory=psycopg2.extras.DictCursor)
    cur.execute("""
        SELECT ps.name AS set_name,
               AVG(COALESCE(pc.elo, 1000)) AS avg_elo,
               COUNT(*) AS count
        FROM public.pokemon_card pc
        JOIN public.pokemon_sets ps ON ps.id = pc.set_id
        GROUP BY ps.name
        ORDER BY avg_elo DESC;
    """)
    rows = cur.fetchall()
    cur.close(); conn.close()
    return jsonify(_rows_to_dict(rows, "set_name"))

@app.route('/api/stats/rarities', methods=['GET'])
def stats_rarities():
    conn = get_db_connection()
    cur = conn.cursor(cursor_factory=psycopg2.extras.DictCursor)
    cur.execute("""
        SELECT NULLIF(TRIM(pc.rarity), '') AS rarity,
               AVG(COALESCE(pc.elo, 1000)) AS avg_elo,
               COUNT(*) AS count
        FROM public.pokemon_card pc
        GROUP BY rarity
        ORDER BY avg_elo DESC;
    """)
    rows = cur.fetchall()
    cur.close(); conn.close()
    return jsonify(_rows_to_dict(rows, "rarity"))

@app.route('/api/stats/artists', methods=['GET'])
def stats_artists():
    # Filtre optionnel ?min_cards=3 pour éviter les outliers à 1 carte
    min_cards = int(request.args.get('min_cards', 3))
    conn = get_db_connection()
    cur = conn.cursor(cursor_factory=psycopg2.extras.DictCursor)
    cur.execute("""
        SELECT NULLIF(TRIM(pc.artist), '') AS artist,
               AVG(COALESCE(pc.elo, 1000)) AS avg_elo,
               COUNT(*) AS count
        FROM public.pokemon_card pc
        GROUP BY artist
        HAVING COUNT(*) >= %s
        ORDER BY avg_elo DESC;
    """, (min_cards,))
    rows = cur.fetchall()
    cur.close(); conn.close()
    return jsonify(_rows_to_dict(rows, "artist"))

@app.route('/api/stats/years', methods=['GET'])
def stats_years():
    # Année extraite de pokemon_sets.release_date ; on ignore NULL
    conn = get_db_connection()
    cur = conn.cursor(cursor_factory=psycopg2.extras.DictCursor)
    cur.execute("""
        SELECT EXTRACT(YEAR FROM ps.release_date)::INT AS year,
               AVG(COALESCE(pc.elo, 1000)) AS avg_elo,
               COUNT(*) AS count
        FROM public.pokemon_card pc
        JOIN public.pokemon_sets ps ON ps.id = pc.set_id
        WHERE ps.release_date IS NOT NULL
        GROUP BY year
        ORDER BY year ASC;
    """)
    rows = cur.fetchall()
    cur.close(); conn.close()

    return jsonify(_rows_to_dict(rows, "year"))




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




# --- Sets tree: grouped by series, sorted by date ---
@app.route('/api/sets_tree', methods=['GET'])
def api_sets_tree():
    conn = get_db_connection()
    cur = conn.cursor(cursor_factory=psycopg2.extras.DictCursor)
    cur.execute("""
        SELECT ps.id, ps.name, ps.series, ps.release_date, ps.logo_image
        FROM public.pokemon_sets ps
        ORDER BY ps.release_date ASC NULLS LAST, ps.name ASC;
    """)
    rows = cur.fetchall()
    cur.close(); conn.close()

    # group by series
    series = {}
    for r in rows:
        key = r['series'] or 'Unknown'
        if key not in series:
            series[key] = {
                "series": key,
                "release_date": None,
                "sets": []
            }
        series[key]["sets"].append({
            "id": r["id"],
            "name": r["name"],
            "series": key,
            "release_date": r["release_date"].isoformat() if r["release_date"] else None,
            "logo_image": r["logo_image"],  # maintenant dispo dans SELECT
        })
        # set series_release_date = min release_date des sets
        if r["release_date"]:
            if series[key]["release_date"] is None or r["release_date"] < series[key]["release_date"]:
                series[key]["release_date"] = r["release_date"]

    # transformer en liste + trier
    out = []
    for g in series.values():
        out.append({
            "series": g["series"],
            "release_date": g["release_date"].isoformat() if g["release_date"] else None,
            "sets": g["sets"]
        })
    # trier les séries par date
    out.sort(key=lambda x: (x["release_date"] or "9999-12-31", x["series"]))
    # trier les sets par date
    for g in out:
        g["sets"].sort(key=lambda s: (s["release_date"] or "9999-12-31", s["name"]))
    return jsonify(out)


# --- Cards of a set with sorting ---
@app.route('/api/sets/<set_id>/cards', methods=['GET'])
def api_set_cards(set_id):
    sort = (request.args.get('sort') or 'elo_desc').lower()
    if sort == 'elo_asc':
        order = "COALESCE(pc.elo,1000) ASC"
    elif sort == 'id_asc':
        order = "pc.id ASC"
    elif sort == 'id_desc':
        order = "pc.id DESC"
    else:
        order = "COALESCE(pc.elo,1000) DESC"

    conn = get_db_connection()
    cur = conn.cursor(cursor_factory=psycopg2.extras.DictCursor)
    cur.execute(f"""
        SELECT pc.id, pc.name, pc.image_url_large AS image, pc.artist,
               COALESCE(pc.elo,1000) AS elo,
               ps.name AS set_name, ps.series
        FROM public.pokemon_card pc
        JOIN public.pokemon_sets ps ON ps.id = pc.set_id
        WHERE pc.set_id = %s
        ORDER BY {order};
    """, (set_id,))
    rows = cur.fetchall()
    cur.close(); conn.close()

    items = [{
        "id": r["id"],
        "name": r["name"],
        "image": r["image"],
        "artist": r["artist"],
        "elo": float(r["elo"]),
        "set_name": r["set_name"],
        "series": r["series"],
    } for r in rows]
    return jsonify({ "items": items })


if __name__ == '__main__':
    app.run(debug=True)
