import React, { useState, useContext, useEffect } from "react";
import { StatusBar } from "expo-status-bar";
import { View, Alert, Text } from "react-native";
import { Octicons, Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import * as SecureStore from "expo-secure-store";

import { DatabaseContext } from "./_layout";
import { checkUserCredentials } from "../databases/accountDB";

import {
  StyledContainer,
  InnerContainer,
  PageLogo,
  PageTitle,
  SubTitle,
  StyledFormArea,
  LeftIcon,
  StyledInputLabel,
  StyledTextInput,
  RightIcon,
  StyledButton,
  ButtonText,
  MsgBox,
  Line,
  Colors,
  ExtraView,
  ExtraText,
  TextLink,
  TextLinkContent,
} from "../components/styles";

import KeyboardAvoidingWrapper from "../components/KeyboardAvoidingWrapper";

const { brand, darkLight } = Colors;

// Constants
const MAX_FAILED_ATTEMPTS = 5;

const Login = () => {
  const router = useRouter();
  const dbs = useContext(DatabaseContext);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [hidePassword, setHidePassword] = useState(true);
  const [message, setMessage] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [isLocked, setIsLocked] = useState(false);

  // Load stored credentials on mount (auto login)
  useEffect(() => {
    loadStoredCredentials();
  }, []);

  const loadStoredCredentials = async () => {
    try {
      const storedEmail = await SecureStore.getItemAsync("email");
      const storedPassword = await SecureStore.getItemAsync("password");

      if (storedEmail && storedPassword) {
        setEmail(storedEmail);
        setPassword(storedPassword);
        setRememberMe(true);

        // Auto-login attempt
        handleLogin(storedEmail, storedPassword, true);
      }
    } catch (error) {
      console.error("Error loading stored credentials:", error);
    }
  };

  const storeCredentials = async (email, password) => {
    await SecureStore.setItemAsync("email", email);
    await SecureStore.setItemAsync("password", password);
  };

  const clearCredentials = async () => {
    await SecureStore.deleteItemAsync("email");
    await SecureStore.deleteItemAsync("password");
  };

  const handleLogin = async (autoEmail, autoPass, auto = false) => {
    if (isLocked) {
      Alert.alert(
        "Account Locked",
        "Too many failed login attempts. Please try again later."
      );
      return;
    }

    const loginEmail = auto ? autoEmail : email;
    const loginPassword = auto ? autoPass : password;

    if (!loginEmail || !loginPassword) {
      setMessage("Please enter email and password.");
      return;
    }

    if (!dbs || !dbs.accountsDb) {
      Alert.alert("Error", "Database not ready.");
      return;
    }

    try {
      const user = await checkUserCredentials(
        dbs.accountsDb,
        loginEmail,
        loginPassword
      );

      if (user) {
        setMessage("Login successful!");

        if (rememberMe) {
          await storeCredentials(loginEmail, loginPassword);
        } else {
          await clearCredentials();
        }

        router.replace({
          pathname: "Welcome",
          params: { email: user.email },
        });

        setFailedAttempts(0);
      } else {
        const newCount = failedAttempts + 1;
        setFailedAttempts(newCount);
        setMessage("Invalid email or password.");

        if (newCount >= MAX_FAILED_ATTEMPTS) {
          setIsLocked(true);
          Alert.alert(
            "Too Many Attempts",
            "Login is locked temporarily due to repeated failures."
          );
        }
      }
    } catch (error) {
      console.error("Login error:", error);
      setMessage("An error occurred during login.");
    }
  };

  const handleforgotPassword = () => {
    router.push("forgotPassword");
  };

  return (
    <KeyboardAvoidingWrapper>
      <StyledContainer>
        <StatusBar style="dark" />
        <InnerContainer>
          <PageLogo
            resizeMode="cover"
            source={require("../assets/images/loginpage.png")}
          />

          <PageTitle>
            <Text>Scanner App</Text>
          </PageTitle>

          <SubTitle>
            <Text>Account Login</Text>
          </SubTitle>

          <StyledFormArea>
            <MyTextInput
              label="Email Address"
              icon="mail"
              placeholder="example@email.com"
              placeholderTextColor={darkLight}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
            />

            <MyTextInput
              label="Password"
              icon="lock"
              placeholder="••••••••"
              placeholderTextColor={darkLight}
              value={password}
              onChangeText={setPassword}
              secureTextEntry={hidePassword}
              isPassword={true}
              hidePassword={hidePassword}
              setHidePassword={setHidePassword}
            />

            <View style={{ flexDirection: "row", marginBottom: 10 }}>
              <Text
                style={{ color: brand }}
                onPress={() => setRememberMe(!rememberMe)}
              >
                {rememberMe ? "☑ Remember Me" : "☐ Remember Me"}
              </Text>
            </View>

            <MsgBox>
              <Text>{message}</Text>
            </MsgBox>

            <StyledButton onPress={() => handleLogin()}>
              <ButtonText>
                <Text>Login</Text>
              </ButtonText>
            </StyledButton>

            <Text
              style={{ color: brand, marginTop: 10, textAlign: "center" }}
              onPress={handleforgotPassword}
            >
              Forgot Password?
            </Text>

            <Line />

            <ExtraView>
              <ExtraText>
                <Text>Don't have an account? </Text>
              </ExtraText>

              <TextLink onPress={() => router.push("Signup")}>
                <TextLinkContent>
                  <Text>Signup</Text>
                </TextLinkContent>
              </TextLink>
            </ExtraView>
          </StyledFormArea>
        </InnerContainer>
      </StyledContainer>
    </KeyboardAvoidingWrapper>
  );
};

// ---------------- TEXT INPUT COMPONENT ------------------

const MyTextInput = ({
  label,
  icon,
  isPassword,
  hidePassword,
  setHidePassword,
  ...props
}) => {
  return (
    <View>
      <LeftIcon>
        <Octicons name={icon} size={30} color={brand} />
      </LeftIcon>

      <StyledInputLabel>
        <Text>{label}</Text>
      </StyledInputLabel>

      <StyledTextInput {...props} />

      {isPassword && (
        <RightIcon onPress={() => setHidePassword(!hidePassword)}>
          <Ionicons
            name={hidePassword ? "eye-off" : "eye"}
            size={30}
            color={darkLight}
          />
        </RightIcon>
      )}
    </View>
  );
};

export default Login;
