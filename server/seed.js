export const practice=[
{id:'practice-weather',title:'Explora el clima',subject:'Inglés',questions:[
{prompt:'¿Cómo se dice soleado en inglés?',options:['Sunny','Rainy','Cold','Snowy'],answer:0,explanation:'Sunny significa soleado.'},
{prompt:'El búho dice: It is cloudy. ¿Cómo está el día?',options:['Nevado','Caluroso','Nublado','Soleado'],answer:2,explanation:'Cloudy significa nublado.'},
{prompt:'¿Qué palabra corresponde a lluvioso?',options:['Summer','Hot','Stormy','Rainy'],answer:3,explanation:'Rainy significa lluvioso.'},
{prompt:'El zorro tiene frío. ¿Qué palabra usaría?',options:['Hot','Cold','Sunny','Summer'],answer:1,explanation:'Cold significa frío.'},
{prompt:'¿Cómo se dice nevado?',options:['Snowy','Cloudy','Rainy','Stormy'],answer:0,explanation:'Snowy significa nevado.'}]},
{id:'practice-multiplication',title:'El sendero de las multiplicaciones',subject:'Matemáticas',questions:[
{prompt:'Hay 3 mochilas con 4 libros cada una. ¿Cuántos libros hay?',options:['7','12','14','16'],answer:1,explanation:'3 × 4 = 12.'},
{prompt:'¿Cuánto es 6 × 5?',options:['11','25','30','35'],answer:2,explanation:'6 grupos de 5 hacen 30.'},
{prompt:'Liam ve 4 filas de 7 árboles. ¿Cuántos árboles ve?',options:['11','21','24','28'],answer:3,explanation:'4 × 7 = 28.'},
{prompt:'¿Cuánto es 8 × 3?',options:['24','18','32','11'],answer:0,explanation:'8 + 8 + 8 = 24.'},
{prompt:'¿Qué número falta? 5 × __ = 45',options:['8','9','7','6'],answer:1,explanation:'5 × 9 = 45.'}]}];

practice.push(
 {id:'practice-sentence-order',title:'Palabras en el sendero',subject:'Español',gradeMin:1,gradeMax:5,topic:'Orden de oraciones',questions:[
  {type:'ordering',prompt:'Ordena la oración: el búho observa el cielo.',items:['observa','El búho','el cielo.'],answer:[1,0,2],explanation:'El sujeto es «El búho»; después van «observa» y «el cielo».'},
  {type:'ordering',prompt:'Ordena la oración: Liam cuida el bosque.',items:['el bosque.','cuida','Liam'],answer:[2,1,0],explanation:'Liam es quien realiza la acción de cuidar el bosque.'},
  {type:'ordering',prompt:'Ordena la oración: el zorro camina despacio.',items:['despacio.','El zorro','camina'],answer:[1,2,0],explanation:'El zorro camina despacio: quién, qué hace y cómo.'}
 ]},
 {id:'practice-animal-matches',title:'Huellas y hogares',subject:'Ciencias Naturales',gradeMin:0,gradeMax:5,topic:'Seres vivos',questions:[
  {type:'matching',prompt:'Relaciona cada animal con su hogar.',left:['🐟 Pez','🐦 Pájaro','🐝 Abeja'],right:['Colmena','Agua','Nido'],answer:[1,2,0],explanation:'El pez vive en el agua, el pájaro construye un nido y las abejas viven en colmenas.'},
  {type:'matching',prompt:'Relaciona cada parte de la planta con su función.',left:['Raíz','Hoja','Flor'],right:['Participa en la reproducción','Absorbe agua del suelo','Capta luz'],answer:[1,2,0],explanation:'Las raíces absorben agua, las hojas captan luz y las flores intervienen en la reproducción.'},
  {type:'matching',prompt:'Relaciona cada animal con su movimiento habitual.',left:['Mariposa','Delfín','Lombriz'],right:['Nada','Se arrastra','Vuela'],answer:[2,0,1],explanation:'La mariposa vuela, el delfín nada y la lombriz se arrastra.'}
 ]},
 {id:'practice-english-listen',title:'Escucha al explorador',subject:'Inglés',gradeMin:1,gradeMax:6,topic:'Vocabulario auditivo',questions:[
  {type:'listening',spokenText:'Good morning',prompt:'Escucha y elige el significado.',options:['Buenos días','Buenas noches','Gracias','Adiós'],answer:0,explanation:'Good morning significa buenos días.'},
  {type:'listening',spokenText:'The fox is orange',prompt:'¿De qué color es el zorro?',options:['Blue','Green','Orange','White'],answer:2,explanation:'Orange significa naranja.'},
  {type:'listening',spokenText:'I have three books',prompt:'¿Cuántos libros tiene?',options:['Uno','Tres','Cinco','Dos'],answer:1,explanation:'Three significa tres.'}
 ]},
 {id:'practice-river-calculation',title:'Cuentas junto al río',subject:'Matemáticas',gradeMin:2,gradeMax:5,topic:'Operaciones básicas',questions:[
  {type:'number',prompt:'Liam reúne 12 hojas y encuentra 7 más. ¿Cuántas tiene?',answer:19,explanation:'12 + 7 = 19 hojas.'},
  {type:'number',prompt:'Había 24 piedras y el zorro movió 6. ¿Cuántas quedan?',answer:18,explanation:'24 − 6 = 18 piedras.'},
  {type:'number',prompt:'Hay 4 grupos de 5 semillas. ¿Cuántas semillas hay?',answer:20,explanation:'4 × 5 = 20 semillas.'}
 ]},
 {id:'practice-community-care',title:'Cuidamos nuestra comunidad',subject:'Ciencias Sociales',gradeMin:1,gradeMax:6,topic:'Convivencia',questions:[
  {prompt:'Un compañero está hablando. ¿Cómo lo escuchas?',options:['Lo interrumpo','Espero mi turno','Me burlo','Grito'],answer:1,explanation:'Respetar los turnos ayuda a escucharnos.'},
  {prompt:'Encuentras un libro de otra persona. ¿Qué haces?',options:['Lo escondo','Lo rompo','Lo entrego al profesor','Lo tiro'],answer:2,explanation:'Entregar lo encontrado permite que vuelva a su dueño.'},
  {prompt:'¿Cómo decidimos una tarea en equipo?',options:['Conversando y repartiendo responsabilidades','Obligando a una sola persona','Sin escuchar','Abandonando al grupo'],answer:0,explanation:'Conversar y distribuir tareas permite colaborar.'}
 ]}
);
