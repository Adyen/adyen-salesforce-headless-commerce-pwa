import {Box, Container, Heading, Stack} from '@salesforce/retail-react-app/app/components/shared/ui'
import React from 'react'
import {FormattedMessage} from 'react-intl'

const AdyenCheckoutErrorComponent = () => {
    return (
        <Box background="gray.50">
            <Container
                maxWidth="container.md"
                py={{base: 7, md: 16}}
                px={{base: 0, md: 4}}
                data-testid="sf-checkout-confirmation-container"
            >
                <Stack spacing={4}>
                    <Box layerStyle="card" rounded={[0, 0, 'base']} px={[4, 4, 6]} py={[6, 6, 8]}>
                        <Stack spacing={6}>
                            <Heading align="center" fontSize={['2xl']}>
                                <FormattedMessage
                                    defaultMessage="Something went wrong. Try again!"
                                    id="global.error.something_went_wrong"
                                />
                            </Heading>
                        </Stack>
                    </Box>
                </Stack>
            </Container>
        </Box>
    )
}

export default AdyenCheckoutErrorComponent
