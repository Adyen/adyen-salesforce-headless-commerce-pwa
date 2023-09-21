import React, { useRef, useEffect, useState } from "react";
import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalBody,
} from '@chakra-ui/react'
import AdyenCheckout from '@adyen/adyen-web'
import '@adyen/adyen-web/dist/adyen.css'
import {useAccessToken, useCustomerId} from '@salesforce/commerce-sdk-react'
import {useAdyenCheckout} from '../context/adyen-checkout-context'
import { AdyenPaymentsDetailsService } from "../services/payments-details";

const AdyenActionModal = () => {
  const [handleInProgress, setHandleInProgress] = useState(false)
  const {adyenPaymentMethods, adyenAction} = useAdyenCheckout()
  const {getTokenWhenReady} = useAccessToken()
  const customerId = useCustomerId()

  useEffect(() => {
    console.log(adyenAction)
    if (adyenPaymentMethods && adyenAction && !handleInProgress) {
      handleAction()
    }
  })

  const handleAction = async () => {
    setHandleInProgress(true);
    const token = await getTokenWhenReady()
    const checkout = await AdyenCheckout({
      environment: adyenPaymentMethods.ADYEN_ENVIRONMENT,
      clientKey: adyenPaymentMethods.ADYEN_CLIENT_KEY,
      onAdditionalDetails(state, element) {
        console.log(state);
        sendPaymentsDetails(token, customerId, state.data.details)
      }
    })
    checkout.createFromAction(adyenAction, {challengeWindowSize: '01'}).mount("#action-container")
  }

  const sendPaymentsDetails = async (token, customerId, details) => {
    const adyenPaymentsDetailsService = new AdyenPaymentsDetailsService(token)
    const response = await adyenPaymentsDetailsService.submitPaymentsDetails(details, customerId)
    console.log(response);
  }

  return (
    <Modal isOpen={!!adyenAction}>
      <ModalOverlay />
      <ModalContent>
        <ModalBody>
          <div id="action-container"></div>
        </ModalBody>
      </ModalContent>
    </Modal>
  )
}

export default AdyenActionModal
