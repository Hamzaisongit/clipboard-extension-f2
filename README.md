
<img src="./src/assets/img/icon-128.png" width="25">

# Note-it 

*works across all the chromium based browsers (chrome,edge,brave..)

Originally forked from : https://github.com/teziapp/clipboard-extension

\
**To run the extension on your local**.. go to folder where you want to save the project and follow steps as given below

### Step-1 : Cloning
To clone the project on your local, open git bash and run the following command

``` console
git clone https://github.com/Hamzaisongit/clipboard-extension-f2
```

### Step-2 : Installing packages & modules
After cloning, go to the project root and run the command,
``` console
npm i
```

### Step-3 : Generating build folder
To generate the devlopement-build for development, Go to project root & run the following...

```console
npm run start
```
\
To generate the production-build for deployment & to be able to use it on any website, Go to project root & run the following...
```console
npm run build
```

After running either of the above commands, a build folder should be generated in project's root directory.

### Step-4 : Unpacking the extension on browser
1. Open your browser and got to extension settings
2. Turn on developer mode (upper right)
3. Click on load unpacked (upper left) 
4. Browse to the build folder we generated in project root and select it

### Testing the extension in development-env
- In project root, you'll see a folder named serverHomePage.
- Inside this folder, the *home.html* file is a pre-included dummy HTML page with a bunch of stock symbols listed on it..
- To test the extension on this dummy-site, Simply go to http://lcoalhost:3000 
- turn on the extension from browser toolbar.


