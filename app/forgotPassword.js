// ForgotPassword.js
import React, { useState, useContext } from "react";
import { View, Alert, Text } from "react-native";
import { StatusBar } from "expo-status-bar";
import { useRouter } from "expo-router";
import { Octicons, Ionicons } from "@expo/vector-icons";

import { DatabaseContext } from "./_layout";
import { getUserByEmail, resetPassword } from "../databases/accountDB";

import {
  StyledContainer,
  InnerContainer,
  PageTitle,
  SubTitle,
  StyledFormArea,
  StyledInputLabel,
  StyledTextInput,
  StyledButton,
  ButtonText,
  MsgBox,
  Line,
  ExtraView,
  ExtraText,
  TextLink,
  TextLinkContent,
  LeftIcon,
  RightIcon,
  Colors,
} from "../components/styles";

import KeyboardAvoidingWrapper from "../components/KeyboardAvoidingWrapper";

const { brand, darkLight } = Colors;

export default function ForgotPassword() {
  const router = useRouter();
  const dbs = useContext(DatabaseContext);

  const [email, setEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [hidePassword, setHidePassword] = useState(true);
  const [message, setMessage] = useState("");

  const handleResetPassword = async () => {
    if (!dbs || !dbs.accountsDb) {
      Alert.alert("Error", "Database not ready.");
      return;
    }

    if (!email.trim() || !newPassword.trim()) {
      setMessage("Please enter your email and new password.");
      return;
    }

    try {
      const user = await getUserByEmail(dbs.accountsDb, email);

      if (!user) {
        setMessage("No account found with this email.");
        return;
      }

      await resetPassword(dbs.accountsDb, email, newPassword);

      Alert.alert("Success", "Password has been reset.", [
        { text: "OK", onPress: () => router.replace("/Login") },
      ]);
    } catch (err) {
      console.error("Reset password failed:", err);
      setMessage("Error resetting password. Please try again.");
    }
  };

  return (
    <KeyboardAvoidingWrapper>
      <StyledContainer>
        <StatusBar style="dark" />
        <InnerContainer>
          <PageTitle>
            <Text>Reset Password</Text>
          </PageTitle>

          <SubTitle>
            <Text>Enter your email and new password</Text>
          </SubTitle>

          <StyledFormArea>
            {/* EMAIL INPUT */}
            <InputField
              label="Email Address"
              icon="mail"
              placeholder="Enter your email"
              placeholderTextColor={darkLight}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
            />

            {/* NEW PASSWORD INPUT */}
            <InputField
              label="New Password"
              icon="lock"
              placeholder="********"
              placeholderTextColor={darkLight}
              value={newPassword}
              onChangeText={setNewPassword}
              secureTextEntry={hidePassword}
              isPassword
              hidePassword={hidePassword}
              setHidePassword={setHidePassword}
            />

            <StyledButton onPress={handleResetPassword}>
              <ButtonText>
                <Text>Reset Password</Text>
              </ButtonText>
            </StyledButton>

            <MsgBox>
              <Text>{message}</Text>
            </MsgBox>

            <Line />

            <ExtraView>
              <ExtraText>
                <Text>Back to </Text>
              </ExtraText>
              <TextLink onPress={() => router.replace("/Login")}>
                <TextLinkContent>
                  <Text>Login</Text>
                </TextLinkContent>
              </TextLink>
            </ExtraView>
          </StyledFormArea>
        </InnerContainer>
      </StyledContainer>
    </KeyboardAvoidingWrapper>
  );
}

// Reusable Input Component
const InputField = ({
  label,
  icon,
  isPassword,
  hidePassword,
  setHidePassword,
  ...props
}) => (
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
