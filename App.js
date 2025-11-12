
import React, {useEffect, useState} from "react";
import { StyleSheet, Text, View, FlatList, Image, TouchableOpacity, Modal, TextInput, Button, ActivityIndicator, ScrollView, SafeAreaView } from "react-native";
import Constants from "expo-constants";
import { supabase } from "./src/utils/supabase";
import AsyncStorage from '@react-native-async-storage/async-storage';
import 'react-native-get-random_values';
import { v4 as uuidv4 } from 'uuid';

const TMDB_API_KEY = "39b049069e72e82299bc0fdd787038c8";
const TMDB_BASE_URL = "https://api.themoviedb.org/3";

export default function App() {
  const [movies, setMovies] = useState([]);
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(true);
  const [commentText, setCommentText] = useState("");
  const [comments, setComments] = useState([]);
  const [anonId, setAnonId] = useState(null);
  const [user, setUser] = useState(null);
  const [loginVisible, setLoginVisible] = useState(false);
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState(null);

  useEffect(()=>{ init(); },[]);

  async function init(){ 
    // check existing authenticated session
    const { data: sessData } = await supabase.auth.getSession();
    if (sessData?.session) { setUser(sessData.session.user); setLoginVisible(false); }
    else { setLoginVisible(true); }
    await ensureAnonId();
    fetchPopular();
  }

  async function ensureAnonId(){ 
    try{ const existing = await AsyncStorage.getItem("anon_user_id"); if (existing) { setAnonId(existing); return; } const newId = uuidv4(); await AsyncStorage.setItem("anon_user_id", newId); setAnonId(newId); }catch(e){console.log(e);}
  }

  const fetchPopular = async () => {
    setLoading(true);
    try{
      const res = await fetch(`${TMDB_BASE_URL}/movie/popular?api_key=${TMDB_API_KEY}&language=pt-BR&page=1`);
      const json = await res.json();
      setMovies(json.results || []);
    }catch(e){ console.log(e); }
    setLoading(false);
  }

  const openDetails = async (movie) => {
    setSelected(movie);
    await loadComments(movie.id);
  }

  const loadComments = async (movieId) => {
    try{
      const { data, error } = await supabase.from("comments").select("*").eq("movie_id", movieId).order("created_at", { ascending: false });
      if (!error) setComments(data || []);
    }catch(e){ console.log(e); }
  }

  const addComment = async () => {
    if (!commentText.trim()) return;
    try{
      const uid = user ? user.id : anonId;
      await supabase.from("comments").insert([{ movie_id: selected.id, user_id: uid, content: commentText }]);
      setCommentText("");
      await loadComments(selected.id);
    }catch(e){ console.log(e); }
  }

  const deleteComment = async (id) => {
    try{
      const uid = user ? user.id : anonId;
      await supabase.from("comments").delete().eq("id", id).eq("user_id", uid);
      await loadComments(selected.id);
    }catch(e){ console.log(e); }
  }

  const handleLogin = async () => {
    setLoginLoading(true);
    setLoginError(null);
    try{
      const { data, error } = await supabase.auth.signInWithPassword({ email: loginEmail, password: loginPassword });
      if (error) { setLoginError(error.message); }
      else if (data.session) { setUser(data.session.user); setLoginVisible(false); setLoginEmail(''); setLoginPassword(''); }
      else { setLoginError('Verifique confirmação de e-mail se aplicável.'); }
    }catch(err){ setLoginError('Erro ao entrar'); console.log(err); }
    setLoginLoading(false);
  }

  const handleLogout = async () => {
    try{
      await supabase.auth.signOut();
      setUser(null);
      setLoginVisible(true);
    }catch(e){ console.log(e); }
  }

  if (loading) return (<View style={styles.center}><ActivityIndicator size="large" /></View>);

  return (
    <SafeAreaView style={styles.container}>
      <View style={{flexDirection:'row', justifyContent:'space-between', alignItems:'center', padding:12}}>
        <Text style={styles.title}>Catálogo de Filmes</Text>
        <View>
          {user ? (
            <View style={{flexDirection:'row', alignItems:'center'}}>
              <Text style={{marginRight:8}}>{user.email}</Text>
              <Button title="Logout" onPress={handleLogout} color="#d9534f" />
            </View>
          ) : (
            <Button title="Login" onPress={() => setLoginVisible(true)} />
          )}
        </View>
      </View>

      <FlatList
        data={movies}
        keyExtractor={item => String(item.id)}
        renderItem={({item}) => (
          <TouchableOpacity style={styles.card} onPress={() => openDetails(item)}>
            <Image style={styles.poster} source={{ uri: item.poster_path ? `https://image.tmdb.org/t/p/w300${item.poster_path}` : "https://via.placeholder.com/300x450" }} />
            <View style={{flex:1, padding:8}}>
              <Text style={{fontWeight:"bold"}}>{item.title}</Text>
              <Text numberOfLines={2} style={{color:"#666"}}>{item.release_date}</Text>
            </View>
          </TouchableOpacity>
        )}
      />

      <Modal visible={!!selected} animationType="slide">
        <View style={{flex:1, padding:12}}>
          <Button title="Fechar" onPress={() => setSelected(null)} />
          {selected && (
            <ScrollView>
              <Text style={{fontSize:20, fontWeight:"bold", marginTop:8}}>{selected.title}</Text>
              <Text style={{marginTop:8}}>{selected.overview}</Text>
              <View style={{marginTop:12}}>
                <Text style={{fontWeight:"bold"}}>Comentários</Text>
                <View style={{flexDirection:"row", marginTop:8}}>
                  <TextInput value={commentText} onChangeText={setCommentText} placeholder="Escreva um comentário..." style={{flex:1, borderWidth:1, borderColor:"#ddd", padding:8, borderRadius:6}} />
                  <Button title="Enviar" onPress={addComment} />
                </View>
                <View style={{marginTop:12}}>
                  {comments.length===0 && <Text style={{color:"#666"}}>Nenhum comentário ainda.</Text>}
                  {comments.map(c => (
                    <View key={String(c.id)} style={{padding:8, borderBottomWidth:1, borderColor:"#eee"}}>
                      <Text style={{fontSize:12, color:"#666"}}>{c.user_id} • {new Date(c.created_at).toLocaleString()}</Text>
                      <Text style={{marginTop:4}}>{c.content}</Text>
                      {(user ? user.id : anonId) === c.user_id && <Button title="Remover" onPress={() => deleteComment(c.id)} color="#d9534f" />}
                    </View>
                  ))}
                </View>
              </View>
            </ScrollView>
          )}
        </View>
      </Modal>

      <Modal visible={loginVisible} animationType="slide" transparent={true}>
        <View style={styles.loginOverlay}>
          <View style={styles.loginBox}>
            <Text style={{fontSize:18, fontWeight:'bold', marginBottom:8}}>Entrar</Text>
            {loginError && <Text style={{color:'#d9534f', marginBottom:8}}>{loginError}</Text>}
            <TextInput placeholder="Email" value={loginEmail} onChangeText={setLoginEmail} style={styles.input} autoCapitalize="none" keyboardType="email-address" />
            <TextInput placeholder="Senha" value={loginPassword} onChangeText={setLoginPassword} style={styles.input} secureTextEntry />
            <View style={{flexDirection:'row', justifyContent:'space-between', marginTop:8}}>
              <Button title="Cancelar" onPress={() => setLoginVisible(false)} />
              <Button title={loginLoading ? "Entrando..." : "Entrar"} onPress={handleLogin} />
            </View>
            <View style={{marginTop:8}}>
              <Text style={{fontSize:12, color:'#666'}}>Use seu e-mail e senha cadastrados no Supabase.</Text>
            </View>
          </View>
        </View>
      </Modal>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  title: { fontSize: 20, fontWeight: "bold" },
  card: { flexDirection:"row", margin:8, backgroundColor:"#fafafa", borderRadius:8, overflow:"hidden" },
  poster: { width:100, height:150 },
  center: {flex:1, justifyContent:"center", alignItems:"center"},
  loginOverlay: { flex:1, backgroundColor:"rgba(0,0,0,0.4)", justifyContent:"center", alignItems:"center" },
  loginBox: { width:"90%", maxWidth:400, backgroundColor:"#fff", padding:16, borderRadius:8 },
  input: { borderWidth:1, borderColor:"#ddd", padding:8, borderRadius:6, marginBottom:8 }
});
