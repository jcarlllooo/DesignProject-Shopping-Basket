// app/Welcome.js

import React, { useEffect, useState, useContext } from "react";
import { StatusBar } from "expo-status-bar";
import { View, Alert, ActivityIndicator } from "react-native";
import { useRouter, useLocalSearchParams } from 'expo-router'; // UPDATED: Import useLocalSearchParams

// Import the DatabaseContext
import { DatabaseContext } from '../app/_layout';
import { getUserByEmail } from "../databases/accountDB";
import {
  InnerContainer,
  PageTitle,
  SubTitle,
  StyledFormArea,
  StyledButton,
  ButtonText,
  Line,
  WelcomeContainer,
  WelcomeImage,
  Avatar,
} from "../components/styles";

const Welcome = () => { // UPDATED: Removed 'navigation' and 'route' from props
  const router = useRouter();
  const dbs = useContext(DatabaseContext);
  const { email } = useLocalSearchParams(); // NEW: Get params using the hook

  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchUserData = async () => {
      // The `dbs &&` check is still crucial here
      if (dbs && dbs.accountsDb) { 
        if (!email) {
          console.warn("Welcome: Email not found in route params.");
          setIsLoading(false);
          // Redirect the user to the login screen if no email is found
          router.replace('Login');
          return;
        }
        try {
          const foundUser = await getUserByEmail(dbs.accountsDb, email);
          if (foundUser) {
            setUser(foundUser);
          } else {
            console.log("Welcome: No user found with that email after login.");
            Alert.alert("User Data Missing", "Could not find your user details.");
          }
        } catch (error) {
          console.error("Welcome: Error fetching user data:", error);
          Alert.alert("Database Error", "Failed to load user data.");
        } finally {
          setIsLoading(false);
        }
      } else {
        console.log("Welcome: Database not ready, skipping user data fetch.");
      }
    };
    
    fetchUserData();
  }, [dbs, email]);

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#B04638" />
        <SubTitle welcome={true}>Loading profile...</SubTitle>
      </View>
    );
  }

  return (
    <>
      <StatusBar style="light" />
      <InnerContainer>
        <WelcomeImage
          resizeMode="cover"
          source={require("../assets/images/background.jpg")}
        />
        <WelcomeContainer>
          <PageTitle welcome={true}>Scanner App</PageTitle>
            <SubTitle welcome={true}>
              {user
                ? `Welcome, ${user.fullName}!`
                : "Welcome!"}
            </SubTitle>
          <SubTitle welcome={true}>{user?.email || ""}</SubTitle>

          <StyledFormArea>
            <Avatar
              resizeMode="cover"
              source={require("../assets/images/loginpage.png")}
            />
            <Line />

            <StyledButton
              onPress={() => {
                router.push({
                  pathname: 'homeIndex',
                  params: { user: JSON.stringify(user) },
                });
              }}
              disabled={!user}
            >
              <ButtonText>View Inventory</ButtonText>
            </StyledButton>

            <StyledButton onPress={() => router.replace("Login")}>
              <ButtonText>Logout</ButtonText>
            </StyledButton>
          </StyledFormArea>
        </WelcomeContainer>
      </InnerContainer>
    </>
  );
};

export default Welcome;