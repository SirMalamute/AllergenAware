from flask import Flask, render_template, request, jsonify, redirect
import qrcode
import google.generativeai as genai
import firebase_admin
from firebase_admin import credentials, firestore
from datetime import datetime

app = Flask(__name__)

cred = credentials.Certificate("allergenaware_firebase.json")
firebase_admin.initialize_app(cred)

# Firestore Database instance
db = firestore.client()


with open("system_prompt.txt", "r") as f:
    system_prompt = f.read()

genai.configure(api_key="")

model = genai.GenerativeModel(
    "models/gemini-1.5-flash",
    system_instruction=system_prompt,
)

@app.route("/get_restaurants", methods=['GET'])
def get_restaurants():
    # Retrieve restaurants from Firestore
    restaurants_ref = db.collection('restaurants')
    docs = restaurants_ref.stream()

    # Create a list to hold the restaurant data
    restaurants = []
    seen_names = set()  # Use a set to track unique restaurant names
    
    for doc in docs:
        restaurant_data = doc.to_dict()

        # Ensure we don't process duplicates
        restaurant_name = restaurant_data.get('name')
        if restaurant_name in seen_names:
            continue  # Skip if restaurant is already processed

        seen_names.add(restaurant_name)

        # If the 'ratings' field exists, calculate the average
        ratings = restaurant_data.get('rating', [])  # Get ratings list, not single 'rating'
        if ratings:
            average_rating = sum(ratings) / len(ratings)
            restaurant_data['rating'] = round(average_rating, 2)  # Round for cleaner display

        restaurants.append(restaurant_data)

    print(restaurants)  # Debugging output
    return jsonify(restaurants)

@app.route("/submit_rating", methods=['POST'])
def submit_rating():
    # Get data from the request
    data = request.json
    restaurant_name = data.get('restaurant_name')
    rating = data.get('rating')
    comment = data.get('comment')

    # Find the restaurant document by name
    restaurant_ref = db.collection('restaurants').where('name', '==', restaurant_name).get()

    if restaurant_ref:
        # If restaurant is found, update it
        restaurant_doc = restaurant_ref[0].reference
        restaurant_data = restaurant_ref[0].to_dict()

        # Update the ratings list and comments list in Firestore
        new_rating = int(rating)
        updated_ratings = restaurant_data.get('rating', [])
        updated_ratings.append(new_rating)

        updated_comments = restaurant_data.get('comments', [])
        updated_comments.append(comment)

        # Update Firestore document with the new data
        restaurant_doc.update({
            'rating': updated_ratings,
            'comments': updated_comments,
        })

        return jsonify({'message': 'Rating submitted successfully!'}), 200
    else:
        return jsonify({'message': 'Restaurant not found'}), 404


@app.route("/add_restaurant", methods=['POST'])
def add_restaurant():
    # Get the data from the request
    new_restaurant_data = request.get_json()
    
    # Extract relevant fields
    restaurant_name = new_restaurant_data.get('name')
    star_rating = new_restaurant_data.get('rating')
    comment = new_restaurant_data.get('comment')
    
    if not restaurant_name or not star_rating:  # Ensure name and rating are provided
        return jsonify({'error': 'Restaurant name and rating are required!'}), 400
    
    # Structure the restaurant data to be uploaded
    restaurant_entry = {
        'name': restaurant_name,
        'rating': [star_rating],  # Initialize with the first rating
        'comments': [comment] if comment else []  # Optionally add the first comment
    }
    
    # Add the new restaurant to Firestore
    db.collection('restaurants').add(restaurant_entry)
    
    return jsonify({'message': 'Restaurant added successfully!', 'restaurant': restaurant_entry})

@app.route('/restaurants')
def restaurants():
    # Sample restaurant data
    return render_template('restaurants.html')



@app.route("/404")
def send404():
    return render_template("404.html")
     
@app.route('/forum')
def forum():
    allergy = request.args.get('allergy', 'General')
    list_of_allergies = ['peanut', 'treenut', 'milk', 'egg', 'fish', 'shellfish', 'wheat', 'soy']
    if allergy not in list_of_allergies:
        return redirect("/404")
    posts_ref = db.collection('forums').document(allergy).collection('posts').order_by('timestamp', direction=firestore.Query.DESCENDING)
    posts = posts_ref.stream()
    
    # Collect posts and comments
    forum_posts = []
    for post in posts:
        post_data = post.to_dict()
        post_data['id'] = post.id  # Add post ID to the post data

        # Fetch comments for each post
        comments_ref = db.collection('forums').document(allergy).collection('posts').document(post.id).collection('comments')
        comments = comments_ref.stream()
        post_data['comments'] = [comment.to_dict() for comment in comments]
        
        forum_posts.append(post_data)
    
    if allergy == "peanuts":
        allergy = "peanut"
    elif allergy == "eggs":
        allegy = "egg"
    elif allergy == "treenuts":
        allergy = "treenut"

    return render_template('forum2.html', allergy=allergy, posts=forum_posts)

@app.route('/add_post', methods=['POST'])
def add_post():
    data = request.json
    allergy = data['allergy']
    post_text = data['post_text']
    
    # Create a new post in the specified allergy forum
    post_ref = db.collection('forums').document(allergy).collection('posts').add({
        'text': post_text,
        'timestamp': datetime.utcnow(),
    })
    
    # Firestore returns a tuple (write_result, doc_ref). Extract post ID
    post_id = post_ref[1].id
    
    return jsonify({'status': 'success', 'post_id': post_id})

@app.route('/add_comment', methods=['POST'])
def add_comment():
    data = request.json
    allergy = data['allergy']
    post_id = data['post_id']
    comment_text = data['comment_text']
    
    print(f"Post ID: {post_id}")  # Debugging: Make sure the post_id is being passed correctly
    
    if not post_id:
        return jsonify({'status': 'error', 'message': 'Post ID is missing'}), 400

    # Continue with adding the comment
    comment_ref = db.collection('forums').document(allergy).collection('posts').document(post_id).collection('comments').add({
        'text': comment_text,
        'timestamp': datetime.utcnow(),
    })

    return jsonify({'status': 'success'})


#print(system_prompt)

# Route for chatbot page
@app.route('/')
def chatbot():
    return render_template('chatbot.html')
    
@app.route('/allergy_profile')
def allergy_profile():
    return render_template('allergy_profile.html')

@app.route('/generate_qr', methods=['POST'])
def generate_qr():
    data = request.json
    qr_url = data['url']
    
    # Generate the QR code
    qr_img = qrcode.make(qr_url)
    
    # Create the file name based on the URL (sanitize for filesystem)
    file_name = qr_url.replace('?', '').replace('&', '_').replace('=', '_') + '.png'
    file_path = f'./static/qr_codes/{file_name}'  # Assuming you save to 'static/qr_codes'

    # Save the QR code image
    qr_img.save(file_path)
    
    return jsonify({'file_name': file_name})

@app.route('/allergy_info')
def allergy_info():
    # Get 'allergens' and 'anaphylactic' from the URL query parameters
    allergens = request.args.get('allergens', '')  # Default to empty string if not provided
    anaphylactic = request.args.get('anaphylactic', 'false').lower()  # Convert to lowercase

    # Create an explanation for the 'anaphylactic' condition
    if anaphylactic == 'true':
        anaphylactic_explanation = ("At least one of these allergies are life-threatening and could cause an anaphylactic reaction. "
                                    "Anaphylaxis requires immediate medical attention, such as the administration of epinephrine.")
        anaphylactic_class = 'red lighten-3'  # Class for styling a dangerous condition
    else:
        anaphylactic_explanation = ("This allergy typically isn't life-threatening, but it can still cause significant discomfort. "
                                    "It's important to manage and avoid exposure to prevent symptoms.")
        anaphylactic_class = 'green lighten-3'  # Class for styling a non-life-threatening condition

    # Split allergens into a list for display
    allergens_list = allergens.split(',') if allergens else []

    # Render the data to a template
    return render_template('allergy_info.html', 
                           allergens=allergens_list, 
                           anaphylactic=anaphylactic, 
                           anaphylactic_explanation=anaphylactic_explanation,
                           anaphylactic_class=anaphylactic_class)

# Handle chatbot messages
@app.route('/send_message', methods=['POST'])
def send_message():
    user_message = request.json.get('message')
    print("received")
    try:
        # Use the Gemini model to generate a response based on the user message
        response = model.generate_content(user_message)
        print("generated")
        # Get the text from the response object
        bot_response = response.text
        print("got bot response")
        return jsonify({'message': bot_response})
    except Exception as e:
        print(f"Error generating message: {e}")
        return jsonify({'message': "Sorry, something went wrong. Please try again."})

if __name__ == '__main__':
    app.run(debug=True)
